const axios = require('axios');

async function run() {
  try {
    const client = axios.create({
      baseURL: 'https://api-remuneracion.apscolab.com',
      headers: { 'Origin': 'https://remuneracionescmp.apscolab.com' }
    });

    console.log('Logging in...');
    const loginRes = await client.post('/auth/login', {
      rut: '16.853.223-7',
      password: '123456'
    });

    const { access_token } = loginRes.data;

    const authClient = axios.create({
      baseURL: 'https://api-remuneracion.apscolab.com',
      headers: {
        'Origin': 'https://remuneracionescmp.apscolab.com',
        'Authorization': `Bearer ${access_token}`
      }
    });

    const get = async (url) => {
      const res = await authClient.get(url, { validateStatus: () => true });
      return res.data;
    };

    console.log('Fetching audit logs for some June Viaticos...');
    const juneIds = [380, 381, 382, 413, 414, 420];
    for (const id of juneIds) {
      const logs = await get(`/audit?tipo=VIATICO&id=${id}`);
      console.log(`Viatico ID ${id}:`, logs);
    }

  } catch (err) {
    console.error(err);
  }
}

run();
