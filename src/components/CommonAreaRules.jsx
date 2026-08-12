export default function CommonAreaRules() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Reglas del Área Común</h2>

      {/* Cupo anual */}
      <div className="border-l-4 border-blue-500 pl-4">
        <h3 className="font-semibold text-gray-900 mb-2">📅 Cupo Anual</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <span className="font-medium">Viernes y Sábados:</span> Máximo 2 eventos privados por año</li>
          <li>• <span className="font-medium">Resto de la semana:</span> Sin restricción</li>
          <li>• <span className="font-medium">Uso espontáneo:</span> No descuenta del cupo anual</li>
        </ul>
      </div>

      {/* Horarios de uso */}
      <div className="border-l-4 border-green-500 pl-4">
        <h3 className="font-semibold text-gray-900 mb-2">🕐 Horarios de Uso</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <span className="font-medium">Domingo a Jueves:</span> Hasta las 22:00 hrs</li>
          <li>• <span className="font-medium">Viernes, Sábados y Festivos:</span> Hasta las 02:00 hrs</li>
          <li>• <span className="font-medium">Hora adicional (03:00 hrs):</span> Solo para acompañar visitas a la salida</li>
        </ul>
      </div>

      {/* Notificación */}
      <div className="border-l-4 border-yellow-500 pl-4">
        <h3 className="font-semibold text-gray-900 mb-2">🔔 Notificación Obligatoria</h3>
        <p className="text-sm text-gray-600">
          Es obligatorio notificar a la mesa directiva o a través del grupo de WhatsApp para reservar el área.
        </p>
      </div>

      {/* Responsabilidades del residente */}
      <div className="border-l-4 border-red-500 pl-4">
        <h3 className="font-semibold text-gray-900 mb-2">👤 Responsabilidades del Residente (Anfitrión)</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>
            <span className="font-medium">Limpieza:</span> El área debe quedar completamente limpia al día siguiente antes de las 12:00 hrs
          </li>
          <li>
            <span className="font-medium">Daños:</span> Responsable de cualquier daño o desperfecto en áreas comunes o privadas
          </li>
          <li>
            <span className="font-medium">Seguridad:</span> Responsable de la seguridad de invitados. Moderar ingesta de alcohol para evitar conflictos
          </li>
          <li>
            <span className="font-medium">Vialidad:</span> Los invitados deben permanecer en el área de amenidades, no en la vialidad privada
          </li>
        </ul>
      </div>

      {/* Nota importante */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">⚠️ Nota Importante:</span> El incumplimiento de estas reglas puede resultar en restricciones futuras para usar el área común.
        </p>
      </div>
    </div>
  );
}
