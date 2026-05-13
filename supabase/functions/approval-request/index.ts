import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_KEY   = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL   = Deno.env.get('FROM_EMAIL') ?? 'onboarding@resend.dev'
const VERCEL       = 'https://teammanager-phi.vercel.app'
const ADMIN_EMAIL  = 'jhlee@bigxdata.io'
const FN_BASE      = `${SUPABASE_URL}/functions/v1`

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
  const approveUrl = `${FN_BASE}/approval-action?action=approve&token=${reqToken}`
  const rejectUrl  = `${VERCEL}/#/reject/${reqToken}`
  const amtFmt = Number(amount).toLocaleString('ko-KR')

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#191F28;background:#F7F8FA;">
  <div style="background:#0064FF;color:white;padding:20px 24px;border-radius:12px 12px 0 0;">
    <h2 style="margin:0;font-size:20px;">예산 집행 승인 요청</h2>
  </div>
  <div style="background:white;border:1px solid #E6E8EB;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    <p style="color:#4E5968;margin:0 0 16px;"><strong style="color:#191F28;">${profile.name}</strong>님이 예산 집행 승인을 요청했습니다.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      ${[
        ['팀', String(teamName)],
        ['회계연도', `${fiscalYear}년`],
        ['월', `${month}월`],
        ['사용날짜', String(expenseDate)],
        ['사용자', String(userName)],
        ['항목', String(category)],
        ['내용', description ? String(description) : '-'],
        ['금액', `<strong style="color:#0064FF;font-size:16px;">${amtFmt}원</strong>`],
      ].map(([k, v], i) => `<tr style="background:${i%2===0?'#F7F8FA':'white'}">
        <td style="padding:10px 14px;border:1px solid #E6E8EB;font-weight:600;width:100px;color:#6B7684;">${k}</td>
        <td style="padding:10px 14px;border:1px solid #E6E8EB;">${v}</td>
      </tr>`).join('')}
    </table>
    <div>
      <a href="${approveUrl}" style="display:inline-block;background:#00C896;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin-right:12px;">✅ 승인</a>
      <a href="${rejectUrl}"  style="display:inline-block;background:#FF4B4B;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">❌ 반려</a>
    </div>
  </div>
</body>
</html>`

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Team Budget <${FROM_EMAIL}>`,
        to: [ADMIN_EMAIL],
        subject: `[승인요청] ${teamName} · ${category} ${amtFmt}원`,
        html,
      }),
    })
    if (!emailRes.ok) {
      console.error('Resend error:', await emailRes.text())
    }
  } catch (e) {
    console.error('Email send failed:', e)
  }

  return json({ success: true, requestId: reqData.id })
})
