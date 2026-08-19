alter table public.people add column slug text unique;

update public.people set slug = 'michele' where id = 'f64ad776-f6c1-46f9-a851-d79c84d28ce6';
update public.people set slug = 'armed' where id = '5cf542b9-3e1b-4bae-9348-9eec840a3616';
update public.people set slug = 'biselenge' where id = 'a5d3c578-a528-4806-b358-df68a0508413';
update public.people set slug = 'diessongo' where id = '8ad13ce7-a315-4737-8019-cf803c77d360';
update public.people set slug = 'domfeh' where id = '39cbc9a9-535c-41c7-85da-2f8e0876caba';
update public.people set slug = 'frank' where id = '2b20c09c-ef79-45da-836e-101343b9efa2';
update public.people set slug = 'justice' where id = '8b38c0d6-3adb-4bcf-afec-3eb87ef65db7';
update public.people set slug = 'abraham' where id = '535bf848-3747-437a-b8be-894b47b985bd';
update public.people set slug = 'michelle' where id = '975dd88b-ec76-43ec-a1f0-999693ca7159';
update public.people set slug = 'nana' where id = 'aa436b07-7a54-4d92-935a-3ce728738726';
update public.people set slug = 'samuel' where id = '8967155e-8769-4f3f-9a06-2cdb73d1425a';
update public.people set slug = 'ana-georgiana' where id = '0baac7f7-dffe-499c-a7bc-8df5b25f08df';
update public.people set slug = 'mahuton' where id = '27ab16a7-a02b-4708-b2dd-22a043048384';
