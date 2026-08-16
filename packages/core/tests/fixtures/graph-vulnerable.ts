import express from 'express';
import { User } from './models';
import axios from 'axios';

const app = express();

// BOLA: no ownership check
app.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user);
});

// SSRF: user input to fetch
app.get('/fetch', async (req, res) => {
  const url = req.query.url;
  const response = await axios.get(url);
  res.json(response.data);
});

// Secure: ownership check + DTO
app.get('/secure/users/:id', authenticateToken, async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, userId: req.user.id });
  res.json({ id: user.id, name: user.name });
});
