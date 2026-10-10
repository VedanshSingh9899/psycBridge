<#
.SYNOPSIS
  Seeds a Phase 1 demo journey: join -> status -> triage -> accept -> chat -> end.
.DESCRIPTION
  Backend must be running (cd backend; npm run dev).
  Uses a fresh device_uuid every run so the 1-free/24h guard never blocks re-runs.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File docs/seed.demo.ps1
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File docs/seed.demo.ps1 -Lang hi -Nickname QuietFox12 -Vote true
#>
param(
  [string]$Base = "http://localhost:3001/api/v1",
  [string]$Lang = "hi",
  [string]$Nickname = "QuietFox12",
  [ValidateSet("yes", "no", "skip")]
  [string]$Triage = "no",
  [bool]$Vote = $true
)

$ErrorActionPreference = "Stop"
$device = "seed-dev-{0}" -f ([guid]::NewGuid().ToString().Substring(0, 8))

function Post($url, $obj) {
  Invoke-RestMethod -Method Post -Uri $url -ContentType "application/json" `
    -Body ($obj | ConvertTo-Json -Depth 5)
}

Write-Host "== psycBridge Phase 1 seed ==" -ForegroundColor Cyan
Write-Host "base=$Base device=$device lang=$Lang triage=$Triage"

# 1. join
$j = Post "$Base/talk-now/join" @{ device_uuid = $device; nickname = $Nickname; lang = $Lang }
$caseId = $j.case_id
Write-Host ("[join] case={0} pos=#{1} eta={2}m hours_open={3}" -f $j.case_id, $j.position, $j.eta_min, $j.hours_open)

# 2. status
$s = Invoke-RestMethod "$Base/talk-now/status?case_id=$caseId"
Write-Host ("[status] status={0} pos=#{1} online={2}" -f $s.status, $s.position, $s.online_count)

# 3. triage
$t = Post "$Base/talk-now/triage" @{ case_id = $caseId; unsafe_self = $Triage }
Write-Host ("[triage] action={0}" -f $t.action)
if ($t.action -eq "sos") {
  Write-Host "[sos] high-risk routed to SOS, NOT queue. helplines:" -ForegroundColor Yellow
  $t.helplines | ConvertTo-Json -Depth 3 | Write-Host
  Write-Host "[stop] accept would 409 here by design. Seed done (SOS path)." -ForegroundColor Yellow
  Write-Host ("CASE_ID={0}" -f $caseId)
  exit 0
}

# 4. accept
$a = Post "$Base/talk-now/accept" @{ case_id = $caseId; listener_id = "listener-1" }
$ses = $a.session_id
Write-Host ("[accept] session={0} alias={1} wrap={2}m close={3}m" -f $ses, $a.alias, $a.wrap_at_min, $a.close_at_min)

# 5. chat
Post "$Base/session/$ses/messages" @{ sender = "seeker"; body = "hello, need help (seeded)" } | Out-Null
Post "$Base/session/$ses/messages" @{ sender = "listener"; body = "I am here, take your time (seeded)" } | Out-Null
$msgs = Invoke-RestMethod "$Base/session/$ses/messages"
Write-Host ("[chat] {0} messages:" -f $msgs.messages.Count)
$msgs.messages | ForEach-Object { Write-Host ("  [{0}] {1}" -f $_.sender, $_.body) }

# 6. end + vote
$e = Post "$Base/sessions/$ses/end" @{ helped_vote = $Vote }
Write-Host ("[end] duration={0}s vote={1}" -f $e.duration_sec, $e.helped_vote)

# 7. coordinator peek
$q = Invoke-RestMethod "$Base/coordinator/queue"
Write-Host ("[queue] len={0} online=[{1}]" -f $q.queue_len, ($q.online_listeners -join ","))

Write-Host ""
Write-Host "Seed OK. Paste these into the frontend/API flow:" -ForegroundColor Green
Write-Host ("CASE_ID={0}" -f $caseId)
Write-Host ("SESSION_ID={0}" -f $ses)
