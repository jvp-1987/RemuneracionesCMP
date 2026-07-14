const axios = require('axios');

async function testLogin(rut, password) {
  try {
    const client = axios.create({
      baseURL: 'https://api-remuneracion.apscolab.com',
      withCredentials: true,
      headers: { 'Origin': 'https://remuneracionescmp.apscolab.com' }
    });

    console.log(`Trying login with ${rut}...`);
    const loginRes = await client.post('/auth/login', { rut, password }, {
      validateStatus: () => true
    });

    console.log(`Status for ${rut}:`, loginRes.status);
    if (loginRes.status === 200 && loginRes.headers['set-cookie']) {
      const cookie = loginRes.headers['set-cookie'][0].split(';')[0];
      console.log('Login SUCCESS! Cookie:', cookie);
      
      // Let's get the periods to see if we are in
      const res = await client.get('/periodos', {
        headers: { Cookie: cookie },
        validateStatus: () => true
      });
      console.log('Periods:', res.data.map(p => `${p.mes}/${p.anio}`));
    }
  } catch (err) {
    console.error('Error for ' + rut, err.message);
  }
}

async function run() {
  await testLogin('16.853.223-7', '123456');
  await testLogin('16.853.223-7', '123');
  await testLogin('admin', '123456');
}

run();
