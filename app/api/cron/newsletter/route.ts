export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { SITE } from '@/lib/collections';
import { deliverIncomingAlert } from '@/lib/deliver-alert';
import { sendEmail } from '@/lib/email';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import { db } from '@/lib/supabase/pool';



function authorized(request: Request) {

  const secret = process.env.CRON_SECRET;

  if (!secret) return process.env.NODE_ENV !== 'production';

  const header = request.headers.get('authorization');

  const query = new URL(request.url).searchParams.get('secret');

  return header === `Bearer ${secret}` || query === secret;

}



function isEligibleForDigest(lastSent: string | null | undefined) {

  if (!lastSent) return true;

  const last = new Date(lastSent);

  if (Number.isNaN(last.getTime())) return true;

  const monthAgo = new Date();

  monthAgo.setDate(monthAgo.getDate() - 28);

  return last < monthAgo;

}



export async function GET(request: Request) {

  if (!authorized(request)) {

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  }



  try {

    const client = await db.connect();

    const [subscribersResult, toursResult, updatesResult] = await Promise.all([

      client.query('SELECT id,email,last_digest_at FROM subscribers'),

      client.query('SELECT id,title,slug,country FROM tours LIMIT 6'),

      client.query('SELECT title,slug FROM safari_updates LIMIT 5'),

    ]);

    client.release();

    const subscribers = subscribersResult.rows;
    const tours = toursResult.rows;
    const updates = updatesResult.rows;



    const eligible = (subscribers || []).filter((row) => {

      const email = String(row.email || '').trim();

      return email.includes('@') && isEligibleForDigest(row.last_digest_at ? String(row.last_digest_at) : null);

    });



    if (!eligible.length) {

      return NextResponse.json({ ok: true, sent: 0, reason: 'No eligible subscribers this month' });

    }



    const tourList = (tours || [])

      .map((tour) => {
        const slug =
          String(tour.slug || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') ||
          String(tour.title || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') ||
          String(tour.id || '');
        return `<li><a href="${SITE.url}/tours/${slug}">${tour.title}</a> — ${tour.country || ''}</li>`;
      })

      .join('');

    const newsList = (updates || [])

      .map((post) => `<li><a href="${SITE.url}/safari-updates/${post.slug || ''}">${post.title}</a></li>`)

      .join('');



    const html = `

      <div style="font-family:Georgia,serif;max-width:640px;margin:0 auto;color:#1f2937">

        <p>${SITE.name}</p>

        <h1>This month on safari</h1>

        <p>Popular tour packages and the latest safari updates from our team.</p>

        <h2>Popular tours</h2>

        <ul>${tourList || '<li>Browse live packages on our website.</li>'}</ul>

        <h2>Safari updates</h2>

        <ul>${newsList || '<li>New stories are published on the journal.</li>'}</ul>

        <p><a href="${SITE.url}">Visit Eton Safaris</a></p>

      </div>

    `;



    let sent = 0;

    const now = new Date().toISOString();



    for (const row of eligible) {

      const email = String(row.email || '').trim();

      const result = await sendEmail({

        title: `${SITE.name} monthly safari digest`,

        message: 'Popular tours and safari updates for this month.',

        html,

        to: [email],
        skipAdminCopy: true,
        category: 'subscriber',

      });

      if (!result.ok) continue;

      sent += 1;

      if (row.id) {

        await saveWithColumnFallback('subscribers', { last_digest_at: now }, { id: row.id });

      }

    }



    if (sent > 0) {
      await deliverIncomingAlert({
        title: `${SITE.name} monthly digest sent`,
        message: `The monthly safari digest was emailed to ${sent} subscriber${sent === 1 ? '' : 's'}.`,
        category: 'subscriber',
      });
    }

    return NextResponse.json({ ok: true, sent, eligible: eligible.length });

  } catch (error) {

    console.error('[Newsletter cron] Failed:', error);

    return NextResponse.json(

      { ok: false, error: error instanceof Error ? error.message : 'Cron failed' },

      { status: 500 }

    );

  }

}

