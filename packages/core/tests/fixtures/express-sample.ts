import express from 'express';
const app = express();

app.get('/users/:id', (req, res) => {
  // handler code
});

app.post('/users', (req, res) => {
  // handler code
});

const router = express.Router();
router.get('/orders', (req, res) => {
  // ...
});
