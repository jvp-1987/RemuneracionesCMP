const axios = require('axios');

async function run() {
  try {
    const client = axios.create({
      baseURL: 'https://api-remuneracion.apscolab.com',
      withCredentials: true,
      headers: { 'Origin': 'https://remuneracionescmp.apscolab.com' }
    });

    console.log('Login...');
    const loginRes = await client.post('/auth/login', {
      rut: 'admin',
      password: '123'
    }, {
      validateStatus: () => true
    });

    console.log('Login status:', loginRes.status);
    console.log('Set-Cookie headers:', loginRes.headers['set-cookie']);

    if (loginRes.status === 200 && loginRes.headers['set-cookie']) {
      const cookie = loginRes.headers['set-cookie'][0].split(';')[0];
      console.log('Cookie obtained:', cookie);

      console.log('Fetching proyecciones...');
      const statsRes = await client.get('/dashboard/proyecciones?anio=2026', {
        headers: { Cookie: cookie },
        validateStatus: () => true
      });
      console.log('Proyecciones status:', statsRes.status);
      if (statsRes.status === 200) {
        console.log('Proyecciones Data:', JSON.stringify(statsRes.data, null, 2));
      }
    }
  } catch (err) {
    console.error(err);
  }
}

run();
