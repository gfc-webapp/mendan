export default function handler(req, res) {
  // POSTリクエスト以外は拒否
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { password, type } = req.body;

  // Vercelの環境変数からパスワードを取得
  const correctAdminPass = process.env.ADMIN_PASSWORD;
  const correctParentPass = process.env.PARENT_PASSWORD;

  let isValid = false;

  if (type === 'admin') {
    isValid = (password === correctAdminPass);
  } else if (type === 'parent') {
    isValid = (password === correctParentPass);
  }

  // 合致しているかどうかの判定結果（true / false）だけを返す
  return res.status(200).json({ success: isValid });
}
