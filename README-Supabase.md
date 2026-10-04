# CampusPay Supabase setup

## 1. Create and configure the Supabase project

1. Create a Supabase project and keep the database password private.
2. Open **SQL Editor**, paste all of `supabase/schema.sql`, and run it.
3. In **Authentication → Providers → Email**, enable Email/password and disable email confirmation (CampusPay uses generated internal aliases; it does not send email).
4. In **Authentication → Users**, add the first administrator using the email `uYWRtaW4@campuspay.invalid` and a strong password. Then copy that user's UUID.
5. In SQL Editor, register that Auth user as the CampusPay administrator (replace the UUID):

   ```sql
   insert into public.profiles(user_id,role) values ('PASTE-ADMIN-UUID-HERE','admin');
   ```

6. Deploy the Edge Functions in `supabase/functions/` using the Supabase CLI. Set the project URL and service-role key as Edge Function secrets only; never put the service-role key in the website files. Deploy `campuspay-admin` and `campuspay-student-password`.
7. Copy the project URL and public anon/publishable key from **Project Settings → API** into `js/supabase-config.js`. Those are the only values intended for the browser.
8. Host the complete folder on a static web host with HTTPS. Opening the pages directly as `file://` does not provide the normal web origin needed for cross-device hosting or Edge Function requests.

## 2. Authentication and student accounts

CampusPay keeps the existing username/password form. Usernames are converted to a deterministic internal Auth email alias; no student needs an email address. Supabase Auth stores password hashes. The relational `students` table contains no password field. Admin account creation, username changes, deletion, and password reset go through authenticated Edge Functions that verify the caller's `profiles.role` before using the service key.

## 3. Existing browser data

The original project stores records in each browser's localStorage. Supabase cannot automatically see those separate browser stores. Export or otherwise back up any real records before switching. This project does not upload localStorage automatically, to avoid silently creating duplicate accounts or sending stale data.

## 4. Tables and access controls

`profiles`, `students`, `payments`, `receipts`, `complaints`, `notifications`, `audit_logs`, and `school_settings` are relational tables. RLS policies in `schema.sql` scope student reads to their linked student ID, allow students to submit only their own complaints, and reserve management access for the authenticated admin profile. No service-role key is included in frontend code.
