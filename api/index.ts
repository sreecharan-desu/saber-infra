import { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app';

export default (req: VercelRequest, res: VercelResponse) => {
  // Strip the /api prefix so Express router matches correctly
  req.url = req.url?.replace(/^\/api/, '') || '/';
  return app(req, res);
};
