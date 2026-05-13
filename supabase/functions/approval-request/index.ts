import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BOT_TOKEN      = Deno.env.get('SLACK_BOT_TOKEN')!
const SLACK_CHANNEL  = Deno.env.get('SLACK_CHANNEL_ID')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile || (profile.role !== 'manager' && profile.role !== 'admin')) {
    return json({ error: 'Forbidden' }, 403)
  }

  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return json({ error: 'Invalid JSON' }, 400) }

  const { teamId, teamName, fiscalYear, month, expenseDate, userName, category, description, amount } = body

  const { data: reqData, error: insertError } = await supabase
    .from('approval_requests').insert({
      team_id: teamId, team_name: teamName, fiscal_year: fiscalYear,
      month, expense_date: expenseDate, user_name: userName,
      category, description: description ?? null, amount,
      requester_id: user.id, requester_email: profile.email, requester_name: profile.name,
    }).select().single()

  if (insertError) return json({ error: insertError.message }, 500)

  const reqToken = reqData.token
  const amtFmt = Number(amount).toLocaleString('ko-KR')

  const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: SLACK_CHANNEL,
      text: `${profile.name}님의 예산 집행 승인 요청 — ${teamName} · ${category} ${amtFmt}원`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '📋 예산 집행 승인 요청', emoji: true },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*${profile.name}*님이 예산 집행 승인을 요청했습니다.` },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*팀*\n${teamName}` },
            { type: 'mrkdwn', text: `*항목*\n${category}` },
            { type: 'mrkdwn', text: `*사용자*\n${userName}` },
            { type: 'mrkdwn', text: `*금액*\n${amtFmt}원` },
            { type: 'mrkdwn', text: `*사용날짜*\n${expenseDate}` },
            { type: 'mrkdwn', text: `*내용*\n${description ?? '-'}` },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '✅ 승인', emoji: true },
              style: 'primary',
              action_id: 'approve_request',
              value: reqToken,
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '❌ 반려', emoji: true },
              style: 'danger',
              action_id: 'reject_request',
              value: reqToken,
            },
          ],
        },
      ],
    }),
  })

  const slackData = await slackRes.json()
  if (!slackData.ok) {
    console.error('Slack error:', slackData.error)
    return json({ success: true, requestId: reqData.id, slackError: slackData.error })
  }

  return json({ success: true, requestId: reqData.id })
})
