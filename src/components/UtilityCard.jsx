export default function UtilityCard({ utility, onEdit, onDelete, canEdit }) {
  const categoryColors = {
    'Seguridad': 'bg-red-50 border-red-200',
    'Mantenimiento': 'bg-yellow-50 border-yellow-200',
    'Contactos': 'bg-blue-50 border-blue-200',
    'Notas Generales': 'bg-purple-50 border-purple-200'
  };

  const categoryBadgeColors = {
    'Seguridad': 'bg-red-100 text-red-800',
    'Mantenimiento': 'bg-yellow-100 text-yellow-800',
    'Contactos': 'bg-blue-100 text-blue-800',
    'Notas Generales': 'bg-purple-100 text-purple-800'
  };

  return (
    <div className={`border-l-4 rounded-lg p-4 ${categoryColors[utility.category]}`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900 flex-1">{utility.title}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${categoryBadgeColors[utility.category]}`}>
          {utility.category}
        </span>
      </div>

      <p className="text-gray-700 mb-4 whitespace-pre-wrap break-words">{utility.content}</p>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {utility.updatedAt ? new Date(utility.updatedAt).toLocaleDateString('es-MX') : 'Sin fecha'}
        </span>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(utility)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Editar
            </button>
            <button
              onClick={() => {
                if (confirm('¿Estás seguro que deseas eliminar este item?')) {
                  onDelete(utility.id);
                }
              }}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
