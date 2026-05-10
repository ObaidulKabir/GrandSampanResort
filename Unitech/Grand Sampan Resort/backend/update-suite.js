fetch(`${process.env.API_URL}/suites/S-101`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin' },
  body: JSON.stringify({ planImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80' })
}).then(r=>r.json()).then(console.log);