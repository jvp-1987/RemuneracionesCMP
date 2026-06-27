'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

export default function DashboardPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/dashboard/proyecciones?anio=${year}`);
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

  // Transform data for per-center charts (stacked or grouped)
  const renderHorasExtrasChart = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold mb-4">Horas Extras Totales por Mes</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} axisLine={false} tickLine={false} />
            <Tooltip formatter={(val: number) => [`$${val.toLocaleString('es-CL')}`, 'Horas Extras']} />
            <Bar dataKey="horasExtrasTotal" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderSueldosChart = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold mb-4">Sueldos por Mes (Proyección)</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} axisLine={false} tickLine={false} />
            <Tooltip formatter={(val: number) => [`$${val.toLocaleString('es-CL')}`, 'Total Sueldos']} />
            <Line type="monotone" dataKey="sueldosTotal" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderReemplazosChart = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold mb-4">Número de Reemplazos Activos por Mes</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip formatter={(val: number) => [val, 'Reemplazos']} />
            <Bar dataKey="reemplazosTotal" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Proyecciones Gráficas Consolidadas</h1>
          <p className="text-gray-500 mt-1">Resumen anual de pagos, horas extras y personal de reemplazo</p>
        </div>
        
        <select 
          value={year} 
          onChange={(e) => setYear(Number(e.target.value))}
          className="bg-white border border-gray-200 rounded-lg px-4 py-2 font-bold shadow-sm"
        >
          {[2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderHorasExtrasChart()}
        {renderSueldosChart()}
        {renderReemplazosChart()}
      </div>
    </div>
  );
}
