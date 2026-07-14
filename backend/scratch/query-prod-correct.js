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
      const res = await authClient.get(url, {
        validateStatus: () => true
      });
      return res.data;
    };

    console.log('\nFetching periods...');
    const periods = await get('/periodos');
    console.log('Periods:', periods.map(p => ({ id: p.id, mes: p.mes, anio: p.anio, estado: p.estado })));

    console.log('\nFetching consolidados...');
    const consolidados = await get('/consolidados');
    
    // Find CESFAM Coñaripe consolidados
    const conaripeConsolidados = consolidados.filter(c => 
      c.centro_salud.nombre.toUpperCase().includes('COÑARIPE')
    );

    console.log('\nCoñaripe Consolidados:');
    console.log(conaripeConsolidados.map(c => ({
      id: c.id,
      periodo: `${c.periodo.mes}/${c.periodo.anio}`,
      centro: c.centro_salud.nombre,
      estado: c.estado_actual_enum,
      gestor: c.usuario_gestor ? c.usuario_gestor.nombre : 'Sincronización Automática'
    })));

    const julyPeriod = periods.find(p => p.mes === 7 && p.anio === 2026);
    const junePeriod = periods.find(p => p.mes === 6 && p.anio === 2026);

    const julyConsolidado = conaripeConsolidados.find(c => c.periodo_id === julyPeriod?.id);
    const juneConsolidado = conaripeConsolidados.find(c => c.periodo_id === junePeriod?.id);

    if (julyConsolidado) {
      console.log(`\nFetching July 2026 Consolidado details (ID: ${julyConsolidado.id})...`);
      const julyDetail = await get(`/consolidados/${julyConsolidado.id}`);
      
      console.log(`\n=== July 2026 Viaticos (Total: ${julyDetail.viaticos.length}) ===`);
      console.log(julyDetail.viaticos.map(v => ({
        id: v.id,
        rut: v.funcionario_rut,
        nombre: v.funcionario.nombre_completo,
        tipo: v.tipo_destino,
        monto: v.monto_calculado,
        justificacion: v.justificacion,
        concepto: v.concepto
      })));

      // Fetch audit logs for July viaticos
      console.log('\n=== Querying Audit Logs for July Viaticos ===');
      for (const v of julyDetail.viaticos) {
        const logs = await get(`/audit?tipo=VIATICO&id=${v.id}`);
        console.log(`Viatico ID ${v.id} (${v.funcionario.nombre_completo}):`);
        console.log(logs);
      }
    }

    if (juneConsolidado) {
      console.log(`\nFetching June 2026 Consolidado details (ID: ${juneConsolidado.id})...`);
      const juneDetail = await get(`/consolidados/${juneConsolidado.id}`);
      
      console.log(`\n=== June 2026 Viaticos (Total: ${juneDetail.viaticos.length}) ===`);
      console.log(juneDetail.viaticos.map(v => ({
        id: v.id,
        rut: v.funcionario_rut,
        nombre: v.funcionario.nombre_completo,
        tipo: v.tipo_destino,
        monto: v.monto_calculado,
        justificacion: v.justificacion,
        concepto: v.concepto
      })));
    }

  } catch (err) {
    console.error(err);
  }
}

run();
