import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  uploadBankStatementFile, 
  createBankStatement, 
  getBankStatementsByMonthYear,
  deleteBankStatement 
} from '../services/bankStatementService';
import { getCurrentMonth, getCurrentYear, getMonthName } from '../utils/dateValidation';
import { validateFile } from '../utils/fileValidation';

export default function BankStatementPanel({ onStatementCreated }) {
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [notes, setNotes] = useState('');
  const [statements, setStatements] = useState([]);
  const [loadingStatements, setLoadingStatements] = useState(true);

  useEffect(() => {
    loadStatements();
  }, [selectedMonth, selectedYear]);

  const loadStatements = async () => {
    try {
      setLoadingStatements(true);
      const data = await getBankStatementsByMonthYear(selectedMonth, selectedYear);
      setStatements(data);
    } catch (err) {
      console.error('Error al cargar estados de cuenta:', err);
    } finally {
      setLoadingStatements(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error);
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedFile) {
      setError('Por favor selecciona un archivo');
      return;
    }

    setLoading(true);

    try {
      // Upload file
      const { downloadURL, fileName } = await uploadBankStatementFile(
        selectedFile, 
        selectedMonth, 
        selectedYear, 
        currentUser.uid
      );

      // Create statement record
      await createBankStatement({
        month: selectedMonth,
        year: selectedYear,
        fileName,
        fileUrl: downloadURL,
        originalName: selectedFile.name,
        uploadedBy: currentUser.uid,
        notes: notes.trim()
      });

      setSuccess('Estado de cuenta subido exitosamente');
      setSelectedFile(null);
      setNotes('');

      setTimeout(() => {
        setSuccess('');
        setShowForm(false);
        loadStatements();
        if (onStatementCreated) {
          onStatementCreated();
        }
      }, 2000);
    } catch (err) {
      console.error('Error al subir estado de cuenta:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (statementId) => {
    if (!confirm('¿Estás seguro de eliminar este estado de cuenta?')) return;

    try {
      await deleteBankStatement(statementId);
      loadStatements();
      if (onStatementCreated) {
        onStatementCreated();
      }
    } catch (err) {
      console.error('Error al eliminar:', err);
      setError('Error al eliminar el estado de cuenta');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">🏦</span>
            Estados de Cuenta del Banco
          </h2>
          <p className="text-sm text-gray-600">Subir y gestionar estados de cuenta mensuales</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showForm
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          {showForm ? 'Cancelar' : 'Subir Estado'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6 space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-2">
                Mes
              </label>
              <select
                id="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>
                    {getMonthName(month)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
                Año
              </label>
              <input
                type="number"
                id="year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
              Archivo del Estado de Cuenta
            </label>
            <input
              type="file"
              id="file"
              onChange={handleFileChange}
              accept=".pdf,.xlsx,.xls,.csv"
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Formatos: PDF, XLSX, XLS, CSV
            </p>
            {selectedFile && (
              <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                ✓ {selectedFile.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notas (Opcional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100"
              placeholder="Agregar notas sobre el estado de cuenta..."
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Subiendo...' : 'Subir Estado de Cuenta'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={loading}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Statements List */}
      {loadingStatements ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : statements.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No hay estados de cuenta para {getMonthName(selectedMonth)} {selectedYear}
        </div>
      ) : (
        <div className="space-y-3">
          {statements.map((statement) => (
            <div
              key={statement.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{statement.originalName}</p>
                  <p className="text-sm text-gray-500">
                    {getMonthName(statement.month)} {statement.year} • 
                    Subido el {statement.createdAt?.toLocaleDateString('es-MX')}
                  </p>
                  {statement.notes && (
                    <p className="text-sm text-gray-500 mt-1">{statement.notes}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={statement.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Ver
                </a>
                <a
                  href={statement.fileUrl}
                  download
                  className="px-3 py-2 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                >
                  Descargar
                </a>
                <button
                  onClick={() => handleDelete(statement.id)}
                  className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
