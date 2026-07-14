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
    console.log('LoggedIn.');

    const authClient = axios.create({
      baseURL: 'https://api-remuneracion.apscolab.com',
      headers: {
        'Origin': 'https://remuneracionescmp.apscolab.com',
        'Authorization': `Bearer ${access_token}`
      }
    });

    // Let's call /audit?tipo=... wait, how do we get all recent audit logs?
    // Let's check how the audit controller is defined.
    // In audit.controller.ts:
    // @Get() getLogs(@Query('tipo') tipo: string, @Query('id', ParseIntPipe) id: number)
    // Wait, getLogs requires a specific tipo and id.
    // Let's see if there is any general endpoint or if we can run a custom check.
    // Wait! Can we get audit logs for the consolidado ID 10 (July 2026 Coñaripe)?
    // Let's check if we can query audit logs for consolidado 10.
    
    console.log('Fetching audit logs for Consolidado ID 10 (July 2026 Coñaripe)...');
    const logsConsolidado = await authClient.get('/audit?tipo=CONSOLIDADO&id=10', { validateStatus: () => true });
    console.log('Logs Consolidado 10:', logsConsolidado.status, logsConsolidado.data);

    console.log('Fetching audit logs for Consolidado ID 9 (June 2026 Coñaripe)...');
    const logsConsolidado9 = await authClient.get('/audit?tipo=CONSOLIDADO&id=9', { validateStatus: () => true });
    console.log('Logs Consolidado 9:', logsConsolidado9.status, logsConsolidado9.data);

    // Let's see if we can get logs for the viaticos IDs that were in July:
    // July viaticos IDs: 372, 373, 374, 375, 376, 377, 378, 379.
    // Wait, the previous script ran `/audit?tipo=VIATICO&id=372` etc., and they all returned `[]`.
    // Why were they empty? Because audit logs are only created on update or remove, not on creation.
    
  } catch (err) {
    console.error(err);
  }
}

run();
