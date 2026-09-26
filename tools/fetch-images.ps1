# Image utility for the Cafe project.
# Verifies candidate photo URLs and (with -Download) saves them into public/img.
param(
    [switch]$Download
)

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'public\img'
if ($Download -and -not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

# name = local file name (without extension) ; url = source
# NOTE: every entry below was verified by eye against the downloaded photo, so the
#       file name matches what is actually visible in the image.
$targets = [ordered]@{
    # --- pizzas -------------------------------------------------------------
    'pizza-margherita'   = 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1000&q=72&fm=jpg'  # basil + mozzarella margherita
    'pizza-fourcheese'   = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1000&q=72&fm=jpg'  # four-cheese, rosemary, cherry tomato
    'pizza-salami'       = 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=1000&q=72&fm=jpg'  # cured salami slices
    'pizza-pepperoni'    = 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=1000&q=72&fm=jpg'  # classic pepperoni
    'pizza-hawaiian'     = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1000&q=72&fm=jpg'  # chicken tikka + pineapple
    'pizza-cheeseburst'  = 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=1000&q=72&fm=jpg'  # burrata + rocket garden pizza
    # --- fries --------------------------------------------------------------
    'fries-classic'      = 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=1000&q=72&fm=jpg'  # plain salted basket fries
    'fries-periperi'     = 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=1000&q=72&fm=jpg'  # shoestring fries, herb/chilli dust
    'fries-parmesan'     = 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=1000&q=72&fm=jpg'  # parmesan + herb fries (dark slate)
    'fries-loaded'       = 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=1000&q=72&fm=jpg'  # fries + red relish dip on kraft paper
    'fries-onionrings'   = 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=1000&q=72&fm=jpg'  # golden onion rings in newspaper
    'fries-wedges'       = 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=1000&q=72&fm=jpg'  # peppered thick-cut wedges on wood
    # --- shakes -------------------------------------------------------------
    'shake-chocolate'    = 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=1000&q=72&fm=jpg'  # chocolate shake
    'shake-strawberry'   = 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=1000&q=72&fm=jpg'  # strawberry shake
    'shake-caramel'      = 'https://images.unsplash.com/photo-1553787499-6f9133860278?w=1000&q=72&fm=jpg'  # caramel / mocha shake
    'shake-oreo'         = 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=1000&q=72&fm=jpg'  # cookie-crumb oreo shake
    'shake-coldcoffee'   = 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=1000&q=72&fm=jpg'  # iced cold coffee
    'cafe-interior'      = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1400&q=72&fm=jpg'
    'cafe-counter'       = 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=1400&q=72&fm=jpg'
    'cafe-table'         = 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=1200&q=72&fm=jpg'
    'cafe-latte'         = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1200&q=72&fm=jpg'
    'hero-ambience'      = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=72&fm=jpg'
    'cafe-hero-2'        = 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1600&q=72&fm=jpg'
}

foreach ($name in $targets.Keys) {
    $url = $targets[$name]
    $file = Join-Path $outDir "$name.jpg"
    try {
        $head = Invoke-WebRequest -Uri $url -Method Head -TimeoutSec 20 -UseBasicParsing
        $len = $head.Headers['Content-Length']
        if ($Download) {
            Invoke-WebRequest -Uri $url -OutFile $file -TimeoutSec 40 -UseBasicParsing
            $size = (Get-Item $file).Length
            Write-Output ("DOWNLOADED  {0,-20} {1,8} bytes" -f $name, $size)
        } else {
            Write-Output ("OK          {0,-20} {1,8} bytes" -f $name, $len)
        }
    } catch {
        Write-Output ("FAIL        {0,-20} {1}" -f $name, $_.Exception.Message)
    }
}
