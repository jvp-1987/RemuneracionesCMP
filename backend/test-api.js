const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:3001/funcionarios', {
      rut: "1-9",
      nombre_completo: "Test Func",
      profesion_enum: "MEDICO",
      categoria_aps: "A",
      nivel_aps: 1,
      jornada_horas: 44,
      centro_salud_id: 1
    });
    console.log(res.data);
  } catch (e) {
    console.log("Error:", e.response?.status, e.response?.data);
  }
}
test();
