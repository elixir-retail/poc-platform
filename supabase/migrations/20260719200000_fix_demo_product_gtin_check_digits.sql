-- Repair demo product GTINs so they use valid EAN-13 check digits.

update public.store_product
set
  gtin = case sku
    when 'DEMO-RICE-5KG' then '8901234567890'
    when 'DEMO-PHONE-001' then '8901234567883'
    when 'DEMO-LAPTOP-001' then '8901234567876'
    when 'DEMO-HEADPHONES' then '8901234567869'
    else gtin
  end,
  changed_at = now()
where sku in ('DEMO-RICE-5KG', 'DEMO-PHONE-001', 'DEMO-LAPTOP-001', 'DEMO-HEADPHONES');
