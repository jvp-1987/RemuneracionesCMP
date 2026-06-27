'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

export default function DashboardPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedCentro, setSelectedCentro] = useState('Todos');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || ''}/dashboard/proyecciones?anio=${year}`);
        setData(res.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [year]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center font-bold text-xl">Cargando proyecciones...</div>;
  }

  // Extract all unique health centers
  const allCentros = Array.from(new Set(
    data.flatMap(d => [
      ...Object.keys(d.horasExtrasPorCentro || {}),
      ...Object.keys(d.sueldosPorCentro || {}),
      ...Object.keys(d.reemplazosPorCentro || {})
    ])
  )).sort().filter(c => c !== 'Sin Centro' && c.trim() !== '');

  // Filter data based on selected health center
  const filteredData = data.map(d => {
    if (selectedCentro === 'Todos') {
      return {
        name: d.name,
        horasExtras: d.horasExtrasTotal,
        sueldos: d.sueldosTotal,
        reemplazos: d.reemplazosTotal
      };
    } else {
      return {
        name: d.name,
        horasExtras: d.horasExtrasPorCentro[selectedCentro] || 0,
        sueldos: d.sueldosPorCentro[selectedCentro] || 0,
        reemplazos: d.reemplazosPorCentro[selectedCentro] || 0
      };
    }
  });

  const renderHorasExtrasChart = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold mb-4 text-gray-800">Horas Extras por Mes (Montos)</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} axisLine={false} tickLine={false} />
            <Tooltip formatter={(val: any) => [val ? `$${Number(val).toLocaleString('es-CL')}` : '$0', 'Horas Extras']} />
            <Bar dataKey="horasExtras" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderSueldosChart = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold mb-4 text-gray-800">Sueldos por Mes (Proyección)</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} axisLine={false} tickLine={false} />
            <Tooltip formatter={(val: any) => [val ? `$${Number(val).toLocaleString('es-CL')}` : '$0', 'Total Sueldos']} />
            <Line type="monotone" dataKey="sueldos" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderReemplazosChart = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold mb-4 text-gray-800">Costo Total de Reemplazos por Mes</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} axisLine={false} tickLine={false} />
            <Tooltip formatter={(val: any) => [val ? `$${Number(val).toLocaleString('es-CL')}` : '$0', 'Costo Reemplazos']} />
            <Bar dataKey="reemplazos" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Proyecciones Gráficas Consolidadas</h1>
          <p className="text-gray-500 mt-1">Resumen anual de pagos, horas extras y costos de reemplazo</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select 
            value={selectedCentro} 
            onChange={(e) => setSelectedCentro(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2 font-bold shadow-sm text-sm"
          >
            <option value="Todos">Todos los Centros</option>
            {allCentros.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select 
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2 font-bold shadow-sm text-sm"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderHorasExtrasChart()}
        {renderSueldosChart()}
        {renderReemplazosChart()}
      </div>
    </div>
  );
}
