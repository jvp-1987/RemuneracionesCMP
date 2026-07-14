const axios = require('axios');

async function run() {
  try {
    const client = axios.create({
      baseURL: 'https://api-remuneracion.apscolab.com',
      headers: { 'Origin': 'https://remuneracionescmp.apscolab.com' }
    });

    console.log('Logging in to production API...');
    const loginRes = await client.post('/auth/login', {
      rut: '16.853.223-7',
      password: '123456'
    }, {
      validateStatus: () => true
    });

    if (loginRes.status !== 200) {
      console.error('Failed to log in. Status:', loginRes.status, loginRes.data);
      return;
    }

    const { access_token } = loginRes.data;
    console.log('Login successful. Token obtained.');

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

    const del = async (url) => {
      const res = await authClient.delete(url, { validateStatus: () => true });
      return res;
    };

    console.log('\nFetching periods...');
    const periods = await get('/periodos');

    console.log('\nFetching consolidados...');
    const consolidados = await get('/consolidados');
    
    // Find CESFAM Coñaripe consolidados
    const conaripeConsolidados = consolidados.filter(c => 
      c.centro_salud.nombre.toUpperCase().includes('COÑARIPE')
    );

    const julyPeriod = periods.find(p => p.mes === 7 && p.anio === 2026);
    const julyConsolidado = conaripeConsolidados.find(c => c.periodo_id === julyPeriod?.id);

    if (!julyConsolidado) {
      console.log('July 2026 Consolidado for Coñaripe not found.');
      return;
    }

    console.log(`\nFetching July 2026 Consolidado details (ID: ${julyConsolidado.id})...`);
    const julyDetail = await get(`/consolidados/${julyConsolidado.id}`);
    
    console.log(`\nFound ${julyDetail.viaticos.length} viaticos in July. Starting deletion...`);
    
    for (const v of julyDetail.viaticos) {
      console.log(`Deleting viatico ID ${v.id} (${v.funcionario.nombre_completo})...`);
      const res = await del(`/viaticos/${v.id}`);
      if (res.status === 200 || res.status === 204) {
        console.log(`  -> Successfully deleted ID ${v.id}`);
      } else {
        console.log(`  -> Failed to delete ID ${v.id}. Status: ${res.status}`, res.data);
      }
    }

    console.log('\nFinished deleting viaticos for July.');

  } catch (err) {
    console.error(err);
  }
}

run();
