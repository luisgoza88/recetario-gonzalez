'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Copy,
  Check,
  X,
  Trash2,
  Shield,
  Home,
  Briefcase,
  Clock,
  Link as LinkIcon,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  createInvitation,
  getHouseholdInvitations,
  cancelInvitation,
  generateInvitationLink,
  copyToClipboard,
  formatInvitationCode,
  getInvitationTimeRemaining,
  getRoleName,
  getRoleColor,
  getRoleDescription
} from '@/lib/invitation-service';
import type { HouseholdMembership, HouseholdInvitation, UserRole } from '@/types';

interface MembersPanelProps {
  householdId: string;
}

export default function MembersPanel({ householdId }: MembersPanelProps) {
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission('manage_members');

  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');
  const [members, setMembers] = useState<HouseholdMembership[]>([]);
  const [invitations, setInvitations] = useState<HouseholdInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de crear invitacion
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInvitation, setNewInvitation] = useState<{
    role: UserRole;
    email: string;
    suggestedName: string;
  }>({
    role: 'familia',
    email: '',
    suggestedName: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createdInvitation, setCreatedInvitation] = useState<HouseholdInvitation | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Cargar datos
  useEffect(() => {
    loadData();
  }, [householdId]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Cargar miembros
      const { data: membersData, error: membersError } = await supabase
        .from('household_memberships')
        .select(`
          *,
          user:user_profiles(*)
        `)
        .eq('household_id', householdId)
        .eq('is_active', true)
        .order('role', { ascending: true });

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Cargar invitaciones activas
      const { invitations: invitationsData } = await getHouseholdInvitations(householdId);
      setInvitations(invitationsData.filter(inv => inv.is_active));
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvitation = async () => {
    setIsCreating(true);
    setError(null);

    const result = await createInvitation({
      householdId,
      role: newInvitation.role,
      email: newInvitation.email || undefined,
      suggestedName: newInvitation.suggestedName || undefined
    });

    if (result.error) {
      setError(result.error);
    } else if (result.invitation) {
      setCreatedInvitation(result.invitation);
      loadData();
    }

    setIsCreating(false);
  };

  const handleCopyCode = async (code: string) => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleCopyLink = async (code: string) => {
    const link = generateInvitationLink(code);
    const success = await copyToClipboard(link);
    if (success) {
      setCopied(`link-${code}`);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Deseas cancelar esta invitacion?')) return;

    const result = await cancelInvitation(invitationId);
    if (result.error) {
      setError(result.error);
    } else {
      loadData();
    }
  };

  const handleRemoveMember = async (membershipId: string, memberName: string) => {
    if (!confirm(`Deseas remover a ${memberName} del hogar?`)) return;

    const { error } = await supabase
      .from('household_memberships')
      .update({ is_active: false })
      .eq('id', membershipId);

    if (error) {
      setError(error.message);
    } else {
      loadData();
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreatedInvitation(null);
    setNewInvitation({ role: 'familia', email: '', suggestedName: '' });
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'empleado':
        return <Briefcase className="w-4 h-4" />;
      case 'familia':
        return <Home className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'members'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Miembros ({members.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'invitations'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Invitaciones ({invitations.length})
            </span>
          </button>
        </div>

        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Invitar
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'members' ? (
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-xl font-semibold text-gray-600">
                    {(member.user?.full_name || member.display_name || '?')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">
                    {member.user?.full_name || member.display_name || 'Usuario'}
                    {member.user_id === user?.id && (
                      <span className="ml-2 text-xs text-green-600">(Tu)</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">{member.user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(member.role)}`}>
                  {getRoleIcon(member.role)}
                  {getRoleName(member.role)}
                </span>

                {canManage && member.user_id !== user?.id && member.role !== 'admin' && (
                  <button
                    onClick={() => handleRemoveMember(member.id, member.user?.full_name || 'este usuario')}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover miembro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay miembros en este hogar
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="bg-white border border-gray-200 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <code className="text-lg font-mono bg-gray-100 px-3 py-1 rounded">
                    {formatInvitationCode(invitation.code)}
                  </code>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(invitation.role)}`}>
                    {getRoleName(invitation.role)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyCode(invitation.code)}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copiar codigo"
                  >
                    {copied === invitation.code ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleCopyLink(invitation.code)}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copiar link"
                  >
                    {copied === `link-${invitation.code}` ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <LinkIcon className="w-4 h-4" />
                    )}
                  </button>
                  {canManage && (
                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Cancelar invitacion"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Expira en {getInvitationTimeRemaining(invitation.expires_at)}
                </span>
                {invitation.email && (
                  <span>
                    Para: {invitation.email}
                  </span>
                )}
                <span>
                  Usos: {invitation.current_uses}/{invitation.max_uses}
                </span>
              </div>
            </div>
          ))}

          {invitations.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay invitaciones activas
            </div>
          )}
        </div>
      )}

      {/* Modal crear invitacion */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  {createdInvitation ? 'Invitacion Creada' : 'Nueva Invitacion'}
                </h3>
                <button
                  onClick={closeCreateModal}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {createdInvitation ? (
                <div className="text-center space-y-6">
                  <div className="p-4 bg-green-50 rounded-xl">
                    <p className="text-sm text-gray-600 mb-2">Codigo de invitacion:</p>
                    <code className="text-3xl font-mono font-bold text-green-700">
                      {formatInvitationCode(createdInvitation.code)}
                    </code>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleCopyCode(createdInvitation.code)}
                      className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {copied === createdInvitation.code ? (
                        <>
                          <Check className="w-5 h-5 text-green-600" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-5 h-5" />
                          Copiar codigo
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleCopyLink(createdInvitation.code)}
                      className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      {copied === `link-${createdInvitation.code}` ? (
                        <>
                          <Check className="w-5 h-5" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <LinkIcon className="w-5 h-5" />
                          Copiar link
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-sm text-gray-500">
                    La invitacion expira en 7 dias
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Rol */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rol del invitado
                    </label>
                    <div className="space-y-2">
                      {(['familia', 'empleado'] as UserRole[]).map((role) => (
                        <label
                          key={role}
                          className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                            newInvitation.role === role
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="role"
                            value={role}
                            checked={newInvitation.role === role}
                            onChange={() => setNewInvitation(prev => ({ ...prev, role }))}
                            className="mt-1"
                          />
                          <div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-medium ${getRoleColor(role)}`}>
                              {getRoleIcon(role)}
                              {getRoleName(role)}
                            </span>
                            <p className="text-sm text-gray-500 mt-1">
                              {getRoleDescription(role)}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Email opcional */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email especifico (opcional)
                    </label>
                    <input
                      type="email"
                      value={newInvitation.email}
                      onChange={(e) => setNewInvitation(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="solo@este-email.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Si se especifica, solo este email podra usar el codigo
                    </p>
                  </div>

                  {/* Nombre sugerido */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del invitado (opcional)
                    </label>
                    <input
                      type="text"
                      value={newInvitation.suggestedName}
                      onChange={(e) => setNewInvitation(prev => ({ ...prev, suggestedName: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Maria Garcia"
                    />
                  </div>

                  {/* Boton crear */}
                  <button
                    onClick={handleCreateInvitation}
                    disabled={isCreating}
                    className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" />
                        Crear Invitacion
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
