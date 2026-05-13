import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BOT_TOKEN      = Deno.env.get('SLACK_BOT_TOKEN')!
const SIGNING_SECRET = Deno.env.get('SLACK_SIGNING_SECRET')!

async function verifySignature(body: string, timestamp: string, sig: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(SIGNING_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const bytes = await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(`v0:${timestamp}:${body}`)
  )
  const hex = Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `v0=${hex}` === sig
}

async function slackApi(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`https://slack.com/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function dmRequester(email: string, text: string) {
  const res = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
    headers: { 'Authorization': `Bearer ${BOT_TOKEN}` },
  })
  const data = await res.json()
  if (data.ok) {
    await slackApi('chat.postMessage', { channel: data.user.id, text })
  }
}

async function updateOriginalMessage(responseUrl: string, text: string, mrkdwn: string) {
  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      replace_original: true,
      text,
      blocks: [{ type: 'section', text: { type: 'mrkdwn', text: mrkdwn } }],
    }),
  })
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('', { status: 405 })

  const rawBody = await req.text()
  const timestamp = req.headers.get('x-slack-request-timestamp') ?? ''
  const signature = req.headers.get('x-slack-signature') ?? ''

  if (!await verifySignature(rawBody, timestamp, signature)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload = JSON.parse(new URLSearchParams(rawBody).get('payload') ?? '{}')
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // ── 버튼 클릭 ──────────────────────────────────────────────────────────────
  if (payload.type === 'block_actions') {
    const action      = payload.actions?.[0]
    const token       = action?.value as string
    const responseUrl = payload.response_url as string

    if (action?.action_id === 'approve_request') {
      const { data: r } = await supabase
        .from('approval_requests').select('*').eq('token', token).single()

      if (!r || r.status !== 'pending') {
        await fetch(responseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'ℹ️ 이미 처리된 요청입니다.', replace_original: false }),
        })
        return new Response('', { status: 200 })
      }

      const { data: seqRows } = await supabase
        .from('expense_items').select('seq')
        .eq('team_id', r.team_id).eq('fiscal_year', r.fiscal_year)
        .order('seq', { ascending: false }).limit(1)
      const nextSeq = Number(seqRows?.[0]?.seq ?? 0) + 1

      const { error: expErr } = await supabase.from('expense_items').insert({
        team_id: r.team_id, fiscal_year: r.fiscal_year, month: r.month,
        seq: nextSeq, expense_date: r.expense_date, user_name: r.user_name,
        category: r.category, description: r.description, amount: r.amount,
        created_by: null,
      })
      if (expErr) {
        console.error('Insert expense error:', expErr)
        return new Response('', { status: 200 })
      }

      await supabase.from('approval_requests').update({
        status: 'approved', resolved_at: new Date().toISOString(),
      }).eq('token', token)

      const amtFmt = Number(r.amount).toLocaleString('ko-KR')
      await updateOriginalMessage(
        responseUrl,
        `✅ 승인 완료 — ${r.team_name} · ${r.category} ${amtFmt}원`,
        `✅ *승인 완료*\n${r.requester_name}님의 *${r.category}* ${amtFmt}원 집행 건이 승인되어 항목에 자동 등록되었습니다.`,
      )
      await dmRequester(r.requester_email, `✅ *승인 완료*: ${r.category} ${amtFmt}원 집행 건이 승인되었습니다. 예산 항목에 자동 등록되었어요.`)
    }

    if (action?.action_id === 'reject_request') {
      // 모달을 먼저 열고 나서 응답 (trigger_id는 3초 내 사용해야 함)
      await slackApi('views.open', {
        trigger_id: payload.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'reject_modal',
          private_metadata: JSON.stringify({ token, responseUrl }),
          title:  { type: 'plain_text', text: '반려 사유 입력' },
          submit: { type: 'plain_text', text: '반려 처리' },
          close:  { type: 'plain_text', text: '취소' },
          blocks: [
            {
              type: 'input',
              block_id: 'reason_block',
              element: {
                type: 'plain_text_input',
                action_id: 'reason_input',
                multiline: true,
                placeholder: { type: 'plain_text', text: '반려 사유를 입력해주세요.' },
              },
              label: { type: 'plain_text', text: '반려 사유' },
            },
          ],
        },
      })
    }

    return new Response('', { status: 200 })
  }

  // ── 모달 제출 ──────────────────────────────────────────────────────────────
  if (payload.type === 'view_submission' && payload.view?.callback_id === 'reject_modal') {
    const { token, responseUrl } = JSON.parse(payload.view.private_metadata ?? '{}')
    const reason = payload.view.state?.values?.reason_block?.reason_input?.value ?? ''

    const { data: r } = await supabase
      .from('approval_requests').select('*').eq('token', token).single()

    if (r && r.status === 'pending') {
      await supabase.from('approval_requests').update({
        status: 'rejected', rejection_reason: reason,
        resolved_at: new Date().toISOString(),
      }).eq('token', token)

      const amtFmt = Number(r.amount).toLocaleString('ko-KR')
      if (responseUrl) {
        await updateOriginalMessage(
          responseUrl,
          `❌ 반려 — ${r.team_name} · ${r.category} ${amtFmt}원`,
          `❌ *반려 처리*\n${r.requester_name}님의 *${r.category}* ${amtFmt}원 집행 건이 반려되었습니다.\n*사유:* ${reason}`,
        )
      }
      await dmRequester(r.requester_email, `❌ *반려*: ${r.category} ${amtFmt}원 집행 건이 반려되었습니다.\n*사유:* ${reason}`)
    }

    return new Response(JSON.stringify({ response_action: 'clear' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response('', { status: 200 })
})
