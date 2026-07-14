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

    console.log('Fetching Coñaripe July Consolidado details (ID: 10)...');
    const julyDetail = await get('/consolidados/10');
    console.log('July 2026 Viaticos details:');
    console.log(julyDetail.viaticos.map(v => ({
      id: v.id,
      nombre: v.funcionario.nombre_completo,
      tipo_destino: v.tipo_destino,
      monto: v.monto_calculado,
      fecha_inicio: v.fecha_inicio,
      fecha_termino: v.fecha_termino,
      consolidado_id: v.consolidado_id,
      concepto: v.concepto
    })));

    console.log('\nFetching Coñaripe June Consolidado details (ID: 9)...');
    const juneDetail = await get('/consolidados/9');
    console.log('June 2026 Viaticos details (sample):');
    console.log(juneDetail.viaticos.map(v => ({
      id: v.id,
      nombre: v.funcionario.nombre_completo,
      tipo_destino: v.tipo_destino,
      monto: v.monto_calculado,
      fecha_inicio: v.fecha_inicio,
      fecha_termino: v.fecha_termino,
      consolidado_id: v.consolidado_id,
      concepto: v.concepto
    })).slice(-10)); // print the last 10 which includes the ones that match

  } catch (err) {
    console.error(err);
  }
}

run();
