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

      console.log('Fetching dashboard...');
      const dashRes = await client.get('/consolidados/dashboard', {
        headers: { Cookie: cookie },
        validateStatus: () => true
      });
      console.log('Dashboard status:', dashRes.status);
    }
  } catch (err) {
    console.error(err);
  }
}

run();
