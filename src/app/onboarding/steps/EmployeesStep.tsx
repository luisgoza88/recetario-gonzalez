"use client";

import { Users, X, Trash2, Clock, Plus, Check } from "lucide-react";
import type { EmployeeConfig } from "../types";
import { WORK_DAYS } from "../constants";

interface EmployeesStepProps {
  hasEmployees: boolean | null;
  setHasEmployees: (has: boolean | null) => void;
  employees: EmployeeConfig[];
  newEmployee: { name: string; role: string };
  setNewEmployee: (emp: { name: string; role: string }) => void;
  newEmployeeDays: string[];
  toggleEmployeeDay: (day: string) => void;
  addEmployee: () => void;
  removeEmployee: (empId: string) => void;
}

export function EmployeesStep({
  hasEmployees,
  setHasEmployees,
  employees,
  newEmployee,
  setNewEmployee,
  newEmployeeDays,
  toggleEmployeeDay,
  addEmployee,
  removeEmployee,
}: EmployeesStepProps) {
  return (
    <div className="py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Empleados del hogar
      </h2>
      <p className="text-gray-600 mb-6">¿Tienes empleados domésticos?</p>

      {hasEmployees === null ? (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setHasEmployees(true)}
            className="p-6 rounded-2xl border-2 border-gray-200 bg-white hover:border-green-500 hover:bg-green-50 transition-all text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users size={32} className="text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-800">Sí, tengo</h3>
            <p className="text-sm text-gray-500 mt-1">
              Quiero gestionar sus tareas
            </p>
          </button>
          <button
            onClick={() => setHasEmployees(false)}
            className="p-6 rounded-2xl border-2 border-gray-200 bg-white hover:border-gray-400 transition-all text-center"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <X size={32} className="text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-800">No tengo</h3>
            <p className="text-sm text-gray-500 mt-1">
              Solo quiero el recetario
            </p>
          </button>
        </div>
      ) : hasEmployees ? (
        <div className="space-y-4">
          {/* Employee list */}
          {employees.length > 0 && (
            <div className="space-y-3">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="bg-white p-4 rounded-xl border-2 border-gray-200 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{emp.name}</p>
                    <p className="text-sm text-gray-500">{emp.role}</p>
                    <div className="flex gap-1 mt-2">
                      {emp.workDays.map((day) => (
                        <span
                          key={day}
                          className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full"
                        >
                          {day.slice(0, 2).toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => removeEmployee(emp.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add employee form */}
          <div className="bg-gray-50 p-4 rounded-xl space-y-4">
            <input
              type="text"
              value={newEmployee.name}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, name: e.target.value })
              }
              placeholder="Nombre del empleado"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-green-500"
            />

            <select
              value={newEmployee.role}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, role: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-green-500"
            >
              <option>Empleada doméstica</option>
              <option>Cocinera</option>
              <option>Jardinero</option>
              <option>Niñera</option>
              <option>Chofer</option>
              <option>Otro</option>
            </select>

            <div>
              <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                <Clock size={14} /> Días de trabajo
              </p>
              <div className="flex gap-2 flex-wrap">
                {WORK_DAYS.map((day) => (
                  <button
                    key={day.id}
                    onClick={() => toggleEmployeeDay(day.id)}
                    className={`w-11 h-11 rounded-full text-sm font-medium transition-all ${
                      newEmployeeDays.includes(day.id)
                        ? "bg-green-500 text-white"
                        : "bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={addEmployee}
              disabled={!newEmployee.name.trim()}
              className="w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Agregar empleado
            </button>
          </div>

          <button
            onClick={() => setHasEmployees(null)}
            className="text-sm text-gray-500 hover:text-gray-700 text-center w-full"
          >
            ← Volver a elegir
          </button>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={40} className="text-gray-400" />
          </div>
          <p className="text-gray-600">Perfecto, continuemos con el resumen</p>
          <button
            onClick={() => setHasEmployees(null)}
            className="text-sm text-green-600 hover:text-green-700 mt-4"
          >
            Cambiar respuesta
          </button>
        </div>
      )}
    </div>
  );
}
