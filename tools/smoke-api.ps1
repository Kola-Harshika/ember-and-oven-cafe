<#
.SYNOPSIS
  End-to-end smoke test for the Ember & Oven API.

.DESCRIPTION
  Point it at a running API (npm run dev:api). It walks the real journey:
  health -> menu -> register -> server quote -> create order -> my orders ->
  waiting-room credit -> start + confirm a test payment -> staff sign-in ->
  kitchen status changes -> access control checks.

.EXAMPLE
  # terminal 1
  $env:STAFF_PASSWORD='dev-kitchen-pass'; npm run db:seed; npm run dev:api
  # terminal 2
  powershell -File tools/smoke-api.ps1
#>
param(
  [string]$BaseUrl = 'http://localhost:4000',
  [string]$StaffEmail = 'staff@ember-oven.local',
  [string]$StaffPassword = 'dev-kitchen-pass'
)

$ErrorActionPreference = 'Stop'
$script:Failures = 0
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Say([string]$message) { Write-Host "  $message" }
function Step([string]$message) { Write-Host "`n== $message" -ForegroundColor Cyan }

function Invoke-Api {
  param(
    [string]$Method = 'GET',
    [string]$Path,
    $Body,
    [switch]$Anonymous,
    [int[]]$ExpectStatus = @(200, 201)
  )

  $params = @{ Uri = "$BaseUrl$Path"; Method = $Method; UseBasicParsing = $true; TimeoutSec = 20 }
  if (-not $Anonymous) { $params.WebSession = $session }
  if ($null -ne $Body) {
    $params.ContentType = 'application/json'
    $params.Body = ($Body | ConvertTo-Json -Depth 12)
  }

  try {
    $response = Invoke-WebRequest @params
    $status = [int]$response.StatusCode
    $payload = if ($response.Content) { $response.Content | ConvertFrom-Json } else { $null }
  } catch {
    $webResponse = $_.Exception.Response
    if (-not $webResponse) { throw }
    $status = [int]$webResponse.StatusCode
    $reader = New-Object System.IO.StreamReader($webResponse.GetResponseStream())
    $text = $reader.ReadToEnd()
    $payload = if ($text) { $text | ConvertFrom-Json } else { $null }
  }

  if ($ExpectStatus -notcontains $status) {
    $script:Failures++
    Write-Host "  FAIL $Method $Path -> $status" -ForegroundColor Red
    if ($payload) { Write-Host ("       " + ($payload | ConvertTo-Json -Depth 6 -Compress)) -ForegroundColor DarkGray }
  } else {
    Say "$Method $Path -> $status"
  }

  return [pscustomobject]@{ Status = $status; Body = $payload }
}

function New-Selection($item) {
  # Default (or first) choice for each single group; nothing selected for multi groups.
  $selection = @{}
  foreach ($group in $item.groups) {
    if ($group.type -eq 'single') {
      $default = $group.choices | Where-Object { $_.default } | Select-Object -First 1
      if (-not $default) { $default = $group.choices | Select-Object -First 1 }
      $selection[$group.id] = @($default.id)
    } else {
      $selection[$group.id] = @()
    }
  }
  return $selection
}

Step 'Health'
$health = Invoke-Api -Path '/api/health'
Say ("environment=" + $health.Body.environment + " menuItems=" + $health.Body.database.menuItems +
     " payment=" + $health.Body.payment.id + " live=" + $health.Body.payment.live)

Step 'Public menu'
$menu = Invoke-Api -Path '/api/menu'
Say ("categories=" + $menu.Body.categories.Count + " items=" + $menu.Body.items.Count + " coupons=" + $menu.Body.coupons.Count)
$pizza = $menu.Body.items | Where-Object { $_.category -eq 'pizza' } | Sort-Object price -Descending | Select-Object -First 1

Step 'Register a customer'
$email = "smoke+" + ([guid]::NewGuid().ToString('N').Substring(0, 8)) + '@example.com'
$register = Invoke-Api -Method POST -Path '/api/auth/register' -Body @{
  name = 'Smoke Guest'; email = $email; password = 'smoke-pass-123'; phone = '9876543210'
} -ExpectStatus @(201)
Say ("customer id=" + $register.Body.user.id)

Step 'Duplicate registration is rejected'
Invoke-Api -Method POST -Path '/api/auth/register' -Body @{
  name = 'Smoke Guest'; email = $email; password = 'smoke-pass-123'
} -ExpectStatus @(409) | Out-Null

Step 'Server-side quote'
$selection = New-Selection $pizza
$quote = Invoke-Api -Method POST -Path '/api/orders/quote' -Body @{
  mode = 'delivery'
  couponCode = 'EMBER10'
  tipPercent = 5
  lines = @(@{ itemId = $pizza.id; quantity = 2; selection = $selection; note = 'Extra napkins' })
}
Say ("subtotal=" + $quote.Body.totals.subtotal + " coupon=" + $quote.Body.totals.couponDiscount +
     " tax=" + $quote.Body.totals.tax + " total=" + $quote.Body.totals.total)

Step 'Invalid customisation is rejected'
$badSelection = @{}
foreach ($key in $selection.Keys) { $badSelection[$key] = @('definitely-not-an-option') }
Invoke-Api -Method POST -Path '/api/orders/quote' -Body @{
  mode = 'dine-in'; lines = @(@{ itemId = $pizza.id; quantity = 1; selection = $badSelection })
} -ExpectStatus @(422) | Out-Null

Step 'Create the order'
$created = Invoke-Api -Method POST -Path '/api/orders' -Body @{
  mode = 'delivery'
  couponCode = 'EMBER10'
  tipPercent = 5
  lines = @(@{ itemId = $pizza.id; quantity = 2; selection = $selection; note = 'Extra napkins' })
  customer = @{
    name = 'Smoke Guest'; phone = '9876543210'
    address = '12 Test Lane, Hyderabad, Telangana'; notes = 'Gate code 4321'
  }
} -ExpectStatus @(201)
$orderId = $created.Body.order.id
Say ("order=" + $orderId + " status=" + $created.Body.order.status + " eta=" + $created.Body.order.etaMinutes +
     " min payable=" + $created.Body.order.payable)

Step 'Order history belongs to this customer only'
$mine = Invoke-Api -Path '/api/orders'
Say ("my orders=" + $mine.Body.orders.Count)

Step 'A signed-out caller cannot read that order'
Invoke-Api -Path "/api/orders/$orderId" -Anonymous -ExpectStatus @(401) | Out-Null

Step 'Waiting-room credit'
$credited = Invoke-Api -Method POST -Path "/api/orders/$orderId/rewards" -Body @{ amount = 45 }
Say ("credit=" + $credited.Body.order.money.bonusCredit + " payable=" + $credited.Body.order.payable)

Step 'Start and confirm a test payment'
$payment = Invoke-Api -Method POST -Path '/api/payments' -Body @{ orderId = $orderId; method = 'upi' } -ExpectStatus @(201)
Say ("payment=" + $payment.Body.payment.id + " provider=" + $payment.Body.provider.id + " live=" + $payment.Body.provider.live)
$confirmed = Invoke-Api -Method POST -Path ("/api/payments/" + $payment.Body.payment.id + '/confirm')
Say ("payment status=" + $confirmed.Body.payment.status + " reference=" + $confirmed.Body.payment.reference)

Step 'Customers cannot reach the kitchen dashboard'
Invoke-Api -Path '/api/admin/orders' -ExpectStatus @(403) | Out-Null

Step 'Staff sign-in'
Invoke-Api -Method POST -Path '/api/auth/logout' | Out-Null
$staff = Invoke-Api -Method POST -Path '/api/auth/login' -Body @{ email = $StaffEmail; password = $StaffPassword }
Say ("staff=" + $staff.Body.user.email + " role=" + $staff.Body.user.role)

Step 'Kitchen moves the order along'
foreach ($status in @('preparing', 'cooking', 'ready', 'out_for_delivery', 'delivered')) {
  $moved = Invoke-Api -Method POST -Path "/api/admin/orders/$orderId/status" -Body @{ status = $status }
  Say ("status -> " + $moved.Body.order.status)
}

Step 'Backwards transitions are refused'
Invoke-Api -Method POST -Path "/api/admin/orders/$orderId/status" -Body @{ status = 'cooking' } -ExpectStatus @(409) | Out-Null

Step 'Dashboard summary'
$summary = Invoke-Api -Path '/api/admin/summary'
Say ("delivered=" + $summary.Body.counts.delivered + " menu items tracked=" + $summary.Body.menu.Count)

if ($script:Failures -gt 0) {
  Write-Host "`n$script:Failures check(s) failed." -ForegroundColor Red
  exit 1
}
Write-Host "`nAll smoke checks passed." -ForegroundColor Green
