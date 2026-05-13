import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_KEY   = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL   = Deno.env.get('FROM_EMAIL') ?? 'onboarding@resend.dev'
const VERCEL       = 'https://teammanager-phi.vercel.app'

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

function approvedHtml(r: Record<string, unknown>) {
  const amtFmt = Number(r.amount).toLocaleString('ko-KR')
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>승인 완료</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F7F8FA;}
    .card{background:white;border-radius:16px;padding:40px;max-width:440px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);}
    .icon{width:64px;height:64px;background:#E6FAF5;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:30px;line-height:64px;}
    h1{font-size:22px;font-weight:700;color:#191F28;margin:0 0 8px;}
    .detail{background:#F7F8FA;border-radius:12px;padding:16px;margin:20px 0;text-align:left;}
    .row{display:flex;justify-content:space-between;padding:7px 0;font-size:14px;color:#333D4B;border-bottom:1px solid #E6E8EB;}
    .row:last-child{border-bottom:none;}
    .label{color:#8B95A1;}
    .amount{font-size:18px;font-weight:700;color:#0064FF;}
    a{display:inline-block;margin-top:20px;background:#0064FF;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>승인 완료</h1>
    <p style="color:#4E5968;margin:0;">예산 집행 항목이 자동 등록되었습니다.</p>
    <div class="detail">
      <div class="row"><span class="label">팀</span><span>${r.team_name}</span></div>
      <div class="row"><span class="label">항목</span><span>${r.category}</span></div>
      <div class="row"><span class="label">사용자</span><span>${r.user_name}</span></div>
      <div class="row"><span class="label">금액</span><span class="amount">${amtFmt}원</span></div>
    </div>
    <a href="${VERCEL}">앱으로 이동</a>
  </div>
</body>
</html>`
}

function alreadyProcessedHtml(status: string) {
  const msg = status === 'approved' ? '이미 승인된 요청입니다.' : '이미 반려된 요청입니다.'
  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><title>처리 완료</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F7F8FA;}.card{background:white;border-radius:16px;padding:40px;max-width:400px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);}</style>
</head>
<body><div class="card"><p style="font-size:40px;margin:0 0 16px;">ℹ️</p><h2 style="margin:0 0 8px;color:#191F28;">${msg}</h2><p style="color:#8B95A1;">이 요청은 이미 처리되었습니다.</p><a href="${VERCEL}" style="display:inline-block;margin-top:20px;background:#0064FF;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;">앱으로 이동</a></div></body>
</html>`
}

async function sendEmail(to: string, subject: string, html: string) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `Team Budget <${FROM_EMAIL}>`, to: [to], subject, html }),
    })
    if (!res.ok) console.error('Resend error:', await res.text())
  } catch (e) {
    console.error('Email send failed:', e)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const url = new URL(req.url)

  // ─── GET: approve or fetch request details ───────────────────────────────
  if (req.method === 'GET') {
    const action = url.searchParams.get('action')
    const token  = url.searchParams.get('token')
    if (!token) return json({ error: 'Missing token' }, 400)

    const { data: r, error } = await supabase
      .from('approval_requests').select('*').eq('token', token).single()
    if (error || !r) return new Response('요청을 찾을 수 없습니다.', { status: 404 })

    if (action === 'approve') {
      if (r.status !== 'pending') {
        return new Response(alreadyProcessedHtml(r.status), { headers: { 'Content-Type': 'text/html' } })
      }

      // Get next seq
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
        return new Response(`서버 오류: ${expErr.message}`, { status: 500 })
      }

      await supabase.from('approval_requests').update({
        status: 'approved', resolved_at: new Date().toISOString(),
      }).eq('token', token)

      const amtFmt = Number(r.amount).toLocaleString('ko-KR')
      await sendEmail(
        r.requester_email,
        `[승인완료] ${r.team_name} · ${r.category} ${amtFmt}원`,
        `<p><strong>${r.category}</strong> ${amtFmt}원 집행 건이 <strong style="color:#00C896;">승인</strong>되었습니다. 예산 집행 항목에 자동 등록되었습니다.</p><a href="${VERCEL}">앱에서 확인하기</a>`,
      )

      return new Response(approvedHtml(r), { headers: { 'Content-Type': 'text/html' } })
    }

    if (action === 'reject') {
      if (r.status !== 'pending') {
        return json({ error: 'already_processed', status: r.status }, 409)
      }
      return json({
        teamName: r.team_name, fiscalYear: r.fiscal_year, month: r.month,
        expenseDate: r.expense_date, userName: r.user_name, category: r.category,
        description: r.description, amount: r.amount, requesterName: r.requester_name,
      })
    }

    return json({ error: 'Unknown action' }, 400)
  }

  // ─── POST: submit rejection reason ───────────────────────────────────────
  if (req.method === 'POST') {
    let body: { token?: string; reason?: string }
    try { body = await req.json() }
    catch { return json({ error: 'Invalid JSON' }, 400) }

    const { token, reason } = body
    if (!token || !reason?.trim()) return json({ error: 'Missing token or reason' }, 400)

    const { data: r, error } = await supabase
      .from('approval_requests').select('*').eq('token', token).single()
    if (error || !r) return json({ error: 'not_found' }, 404)
    if (r.status !== 'pending') return json({ error: 'already_processed' }, 409)

    await supabase.from('approval_requests').update({
      status: 'rejected', rejection_reason: reason.trim(),
      resolved_at: new Date().toISOString(),
    }).eq('token', token)

    const amtFmt = Number(r.amount).toLocaleString('ko-KR')
    await sendEmail(
      r.requester_email,
      `[반려] ${r.team_name} · ${r.category} ${amtFmt}원`,
      `<p><strong>${r.category}</strong> ${amtFmt}원 집행 건이 <strong style="color:#FF4B4B;">반려</strong>되었습니다.</p><p><strong>반려 사유:</strong> ${reason.trim()}</p>`,
    )

    return json({ success: true })
  }

  return json({ error: 'Method not allowed' }, 405)
})
