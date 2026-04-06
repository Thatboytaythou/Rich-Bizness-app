import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { room, username } = req.query;

    if (!room || !username) {
      return res.status(400).json({ error: 'Missing room or username' });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({ error: 'Missing LiveKit env variables' });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
    });

    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    res.status(200).json({ token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Token generation failed' });
  }
}
