import webpush from 'web-push';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const {
    SUPABASE_URL,
    SUPABASE_SECRET_KEY,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return res.status(500).json({ ok: false, error: 'Missing environment variables' });
  }

  webpush.setVapidDetails(
    'mailto:admin@example.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { class_id, current_number } = body || {};

    if (!class_id || current_number === undefined || current_number === null) {
      return res.status(400).json({ ok: false, error: 'class_id and current_number are required' });
    }

    const targetNums = [Number(current_number), Number(current_number) + 1].filter(n => n > 0);
    if (targetNums.length === 0) {
      return res.status(200).json({ ok: true, count: 0 });
    }

    // 対象クラス・対象番号の購読情報をSupabaseから取得（apikeyヘッダのみ）
    const queryUrl = `${SUPABASE_URL}/rest/v1/push_subscriptions?class_id=eq.${encodeURIComponent(class_id)}&order_num=in.(${targetNums.join(',')})&select=id,order_num,endpoint,subscription`;
    const subRes = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SECRET_KEY
      }
    });

    if (!subRes.ok) {
      const errText = await subRes.text();
      return res.status(subRes.status).json({ ok: false, error: errText });
    }

    const targets = await subRes.json();
    let sentCount = 0;

    for (const row of targets) {
      const isNow = Number(row.order_num) === Number(current_number);
      const payload = JSON.stringify({
        title: isNow ? `【${class_id}】あなたの順番です` : `【${class_id}】まもなく順番です`,
        body: isNow
          ? `${row.order_num}番の方、教室へお越しください。`
          : `現在 ${current_number} 番を呼び出し中です（あなたは ${row.order_num} 番）。`,
        url: '/'
      });

      try {
        await webpush.sendNotification(row.subscription, payload);
        sentCount++;
      } catch (pushErr) {
        console.error('Push送信エラー:', pushErr.statusCode, pushErr.body);
        // 購読無効（410/404）はSupabaseから削除
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
          await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${row.id}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_SECRET_KEY }
          });
        }
      }
    }

    return res.status(200).json({ ok: true, count: sentCount, matched: targets.length });
  } catch (err) {
    console.error('send-push error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
