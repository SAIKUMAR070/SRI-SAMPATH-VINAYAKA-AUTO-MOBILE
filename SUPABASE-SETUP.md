# Shop catalogue and orders setup

The customer catalogue, saved order requests and owner dashboard need a Supabase project. The current GitHub Pages site is static; the steps below connect it to the database. Creating products and storing customer requests will not work until these steps are completed.

## 1. Create the database

1. Create a Supabase project at [supabase.com/dashboard](https://supabase.com/dashboard) and save its database password somewhere private.
2. In the project, open **SQL Editor**, create a query, paste the contents of `supabase/schema.sql`, and run it.
3. In **Project Settings → API Keys**, copy the **Project URL** and the **publishable key** (`sb_publishable_...`) for browser use.
4. If changing projects, replace `supabaseUrl` and `supabasePublishableKey` in `config.js` with that project's URL and publishable key.
5. The configured publishable key is intended for websites and is already in the public site code. Never copy a `service_role`, `sb_secret_...`, or other secret key into `config.js`, the website, or a public GitHub repository. Row-level security protects database operations.

## 2. Create the private owner sign-in

1. In **Authentication → Users**, add a user with the owner's email address and a strong password. Turn off public user sign-up if it is enabled.
2. Copy that user's UUID from the user list.
3. In **SQL Editor**, replace `PASTE-OWNER-USER-UUID-HERE` below with that UUID and run:

   ```sql
   insert into public.store_admins (user_id)
   values ('PASTE-OWNER-USER-UUID-HERE')
   on conflict (user_id) do nothing;
   ```

4. Visit `admin.html` on the published website and sign in with that email and password. The owner account is the only account authorized by default.

The owner dashboard can add, edit, publish and hide products, update stock, take or choose product photos on a phone, and review or update request statuses. Product photos are resized in the browser before upload.

### Enable the website background photo

Run this once in the Supabase **SQL Editor**. It lets the public website read the selected background path and limits background uploads to signed-in shop admins. The uploaded background photo is cropped to a wide 16:9 image in the owner dashboard.

```sql
create table if not exists public.site_settings (
  key text primary key,
  value text not null
);

alter table public.site_settings enable row level security;
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
  on public.site_settings for select
  using (true);

drop policy if exists "Store admins can add site settings" on public.site_settings;
create policy "Store admins can add site settings"
  on public.site_settings for insert to authenticated
  with check (public.is_store_admin());

drop policy if exists "Store admins can update site settings" on public.site_settings;
create policy "Store admins can update site settings"
  on public.site_settings for update to authenticated
  using (public.is_store_admin())
  with check (public.is_store_admin());

drop policy if exists "Store admins can upload website backgrounds" on storage.objects;
create policy "Store admins can upload website backgrounds"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'site-backgrounds'
    and public.is_store_admin()
  );
```

The `product-images` storage bucket must be public for the website to display its photos. In `admin.html`, sign in, choose **Hero background photo**, adjust the crop, and save. Refresh the public website after saving.

## 3. Publish the files

Upload the website files and folders to the top level of the GitHub Pages repository, then commit the changes. Include `config.js`, `catalogue.js`, `site-background.js`, `admin.html`, `admin.js`, `admin.css`, the `images` folder, and the `supabase` folder, as well as the updated `index.html`, `styles.css` and `script.js`.

After deployment, open the public site and check the product catalogue. To manage it, open the site's `admin.html` page or choose **Owner sign in** in the footer.

## Orders and stock

- Customers can browse published products, search by name, brand, category or vehicle, and send an order request with their name, phone number, items and optional note.
- A request is **not** a confirmed sale or a stock reservation. Confirm the price, actual quantity and pickup with the customer before accepting the request.
- Saved requests appear in the private owner dashboard. The follow-up WhatsApp link is only offered after the request has been saved.
- The database limits a phone number to five requests per hour to help discourage automated spam.
- Customer names and phone numbers are stored with their requests; use them only to respond to those requests.
- Update stock from the owner dashboard when stock changes. The public catalogue shows only products marked as published.
- Add only products and quantities you have checked. Do not put guesses in the catalogue.

## Add the website to your Google Maps listing

Google Maps does not automatically attach a website link just because the website links to a map pin. Sign in with the Google account that owns or manages the shop's Business Profile. In Google Search or Maps, open the correct shop listing, choose **Edit profile → Contact → Website**, add:

`https://saikumar070.github.io/SRI-SAMPATH-VINAYAKA-AUTO-MOBILE/`

Save and complete any verification Google requests. If the profile says someone else manages it, request access or ownership rather than creating a duplicate listing. The owner must do this in their Google account; the website cannot edit a Google Business Profile on their behalf.
