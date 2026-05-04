'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useAuth } from '@/components/auth-provider'
import { useLocale } from '@/lib/locale'
import { userProfile, type UserProfile } from '@/lib/api'
import { User, Camera, Pencil, Mail, Phone, MapPin, Calendar, IdCard, BadgeInfo, Loader2, CheckCircle2 } from 'lucide-react'

export default function ProfileSettingsPage() {
  const { user, refreshMe } = useAuth()
  const { t } = useLocale()
  const p = t.settings.profile
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [form, setForm] = useState<{
    displayName: string
    firstName: string
    lastName: string
    email: string
    icNumber: string
    dateOfBirth: string
    gender: '' | 'MALE' | 'FEMALE' | 'OTHER'
    phone: string
    addressLine1: string
    addressLine2: string
    postalCode: string
    city: string
    state: string
    country: string
    avatarUrl: string
  }>({
    displayName: '',
    firstName: '',
    lastName: '',
    email: '',
    icNumber: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    postalCode: '',
    city: '',
    state: '',
    country: p.countryDefault,
    avatarUrl: '',
  })

  const applyProfile = (profile: UserProfile) => {
    setForm({
      displayName: profile.displayName ?? '',
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      email: profile.email ?? '',
      icNumber: profile.icNumber ?? '',
      dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
      gender: profile.gender ?? '',
      phone: profile.phone ?? '',
      addressLine1: profile.addressLine1 ?? '',
      addressLine2: profile.addressLine2 ?? '',
      postalCode: profile.postalCode ?? '',
      city: profile.city ?? '',
      state: profile.state ?? '',
      country: profile.country ?? p.countryDefault,
      avatarUrl: profile.avatarUrl ?? '',
    })
  }

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        setLoading(true)
        const profile = await userProfile.get()
        if (!alive) return
        applyProfile(profile)
      } catch {
        if (!alive) return
        setToast({ type: 'error', message: p.loadError })
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [p.countryDefault, p.loadError])

  const [firstName, lastName] = useMemo(() => {
    if (form.firstName || form.lastName) return [form.firstName, form.lastName]
    const fullName = (form.displayName ?? '').trim()
    if (!fullName) return ['', '']
    const parts = fullName.split(/\s+/)
    if (parts.length === 1) return [parts[0], '']
    return [parts.slice(0, -1).join(' '), parts[parts.length - 1]]
  }, [form.displayName, form.firstName, form.lastName])

  const displayValue = (value?: string) => (value && value.trim().length > 0 ? value : p.notSet)
  const initials = (form.displayName?.trim()?.[0] ?? user?.name?.trim()?.[0] ?? 'U').toUpperCase()

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 2500)
  }

  const reloadProfile = async () => {
    const profile = await userProfile.get()
    applyProfile(profile)
  }

  const handleCancel = async () => {
    await reloadProfile()
    setIsEditing(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await userProfile.update({
        displayName: form.displayName,
        firstName: form.firstName,
        lastName: form.lastName,
        icNumber: form.icNumber,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        phone: form.phone,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2,
        postalCode: form.postalCode,
        city: form.city,
        state: form.state,
        country: form.country,
        avatarUrl: form.avatarUrl,
      })
      await refreshMe()
      setIsEditing(false)
      showToast('success', p.savedSuccess)
    } catch {
      showToast('error', p.saveError)
    } finally {
      setSaving(false)
    }
  }

  const handlePickAvatar = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const uploaded = await userProfile.uploadAvatar(file)
      setForm((prev) => ({ ...prev, avatarUrl: uploaded.url }))
      showToast('success', p.avatarUploaded)
    } catch {
      showToast('error', p.avatarUploadError)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div className="w-full px-6 py-8">
      {toast ? (
        <div className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          <CheckCircle2 className="h-4 w-4" />
          {toast.message}
        </div>
      ) : null}

      <div className="mb-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 shadow-sm">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{p.title}</h1>
              <p className="text-sm text-slate-600">{p.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {p.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {saving ? p.saving : p.save}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Pencil className="h-4 w-4" />
                {p.editProfile}
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
      <>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-semibold text-slate-900">{p.profilePictureTitle}</h3>
                    <p className="text-sm text-slate-600">{p.profilePictureSubtitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-500 transition-all duration-200 hover:bg-white hover:text-slate-900"
                  title={p.editProfile}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-32 flex-shrink-0">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {form.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.avatarUrl} alt={p.profilePictureTitle} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-600 text-xl font-semibold text-white">
                        {initials}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 text-sm text-slate-600">
                  {form.avatarUrl ? p.avatarReady : p.noPhoto}
                  {isEditing ? (
                    <div className="mt-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={handlePickAvatar}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                        {uploading ? p.uploading : p.uploadAvatar}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <div className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-2">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-slate-900">{p.personalInfoTitle}</h3>
                  <p className="text-sm text-slate-600">{p.personalInfoSubtitle}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField
                    label={p.firstName}
                    value={displayValue(firstName)}
                    editable={isEditing}
                    onChange={(value) => setField('firstName', value)}
                    required
                  />
                  <InfoField
                    label={p.lastName}
                    value={displayValue(lastName)}
                    editable={isEditing}
                    onChange={(value) => setField('lastName', value)}
                    required
                  />
                </div>

                <InfoField
                  label={p.displayName}
                  value={displayValue(form.displayName)}
                  editable={isEditing}
                  onChange={(value) => setField('displayName', value)}
                />

                <InfoField
                  label={p.emailAddress}
                  value={displayValue(form.email)}
                  readOnly
                  icon={<Mail className="h-4 w-4 text-slate-500" />}
                />

                <InfoField
                  label={p.icNumber}
                  value={displayValue(form.icNumber)}
                  editable={isEditing}
                  onChange={(value) => setField('icNumber', value)}
                  icon={<IdCard className="h-4 w-4 text-slate-500" />}
                />

                <div className="grid grid-cols-2 gap-4">
                  <InfoField
                    label={p.dateOfBirth}
                    value={displayValue(form.dateOfBirth)}
                    editable={isEditing}
                    inputType="date"
                    rawValue={form.dateOfBirth}
                    onChange={(value) => setField('dateOfBirth', value)}
                    icon={<Calendar className="h-4 w-4 text-slate-500" />}
                  />
                  <SelectField
                    label={p.gender}
                    value={form.gender}
                    displayValue={displayValue(form.gender ? p.genders[form.gender] : '')}
                    editable={isEditing}
                    onChange={(value) => setField('gender', value as '' | 'MALE' | 'FEMALE' | 'OTHER')}
                    options={[
                      { value: '', label: p.notSet },
                      { value: 'MALE', label: p.genders.MALE },
                      { value: 'FEMALE', label: p.genders.FEMALE },
                      { value: 'OTHER', label: p.genders.OTHER },
                    ]}
                    icon={<BadgeInfo className="h-4 w-4 text-slate-500" />}
                  />
                </div>
              </div>
            </div>
          </section>

        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <div className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-2">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-slate-900">{p.contactInfoTitle}</h3>
                  <p className="text-sm text-slate-600">{p.contactInfoSubtitle}</p>
                </div>
              </div>

              <InfoField
                label={p.phoneNumber}
                value={displayValue(form.phone)}
                editable={isEditing}
                onChange={(value) => setField('phone', value)}
                icon={<Phone className="h-4 w-4 text-slate-500" />}
                required
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <div className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-2">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-slate-900">{p.addressInfoTitle}</h3>
                  <p className="text-sm text-slate-600">{p.addressInfoSubtitle}</p>
                </div>
              </div>

              <div className="space-y-4">
                <InfoField
                  label={p.addressLine1}
                  value={displayValue(form.addressLine1)}
                  editable={isEditing}
                  onChange={(value) => setField('addressLine1', value)}
                />
                <InfoField
                  label={p.addressLine2}
                  value={displayValue(form.addressLine2)}
                  editable={isEditing}
                  onChange={(value) => setField('addressLine2', value)}
                />

                <div className="grid grid-cols-2 gap-4">
                  <InfoField
                    label={p.postalCode}
                    value={displayValue(form.postalCode)}
                    editable={isEditing}
                    onChange={(value) => setField('postalCode', value)}
                  />
                  <InfoField
                    label={p.city}
                    value={displayValue(form.city)}
                    editable={isEditing}
                    onChange={(value) => setField('city', value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <InfoField
                    label={p.state}
                    value={displayValue(form.state)}
                    editable={isEditing}
                    onChange={(value) => setField('state', value)}
                  />
                  <InfoField
                    label={p.country}
                    value={displayValue(form.country)}
                    editable={isEditing}
                    onChange={(value) => setField('country', value)}
                  />
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
      </>
      )}
    </div>
  )
}

function InfoField({
  label,
  value,
  required,
  editable,
  readOnly,
  inputType,
  rawValue,
  onChange,
  icon,
}: {
  label: string
  value: string
  required?: boolean
  editable?: boolean
  readOnly?: boolean
  inputType?: 'text' | 'date'
  rawValue?: string
  onChange?: (value: string) => void
  icon?: ReactNode
}) {
  if (editable && !readOnly) {
    return (
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-500">
          {label}
          {required ? <span className="ml-1 text-red-400">*</span> : null}
        </label>
        <div className="flex w-full items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
          {icon}
          <input
            type={inputType ?? 'text'}
            value={typeof rawValue !== 'undefined' ? rawValue : value === 'Not set' || value === 'Belum diisi' ? '' : value}
            onChange={(e) => onChange?.(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 outline-none"
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-500">
        {label}
        {required ? <span className="ml-1 text-red-400">*</span> : null}
      </label>
      <div className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900">
        {icon}
        <span className={value === 'Not set' || value === 'Belum diisi' ? 'text-slate-500' : ''}>{value}</span>
      </div>
    </div>
  )
}

function SelectField({
  label,
  value,
  displayValue,
  editable,
  options,
  onChange,
  icon,
}: {
  label: string
  value: string
  displayValue: string
  editable?: boolean
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  icon?: ReactNode
}) {
  if (editable) {
    return (
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-500">{label}</label>
        <div className="flex w-full items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
          {icon}
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 outline-none"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-500">{label}</label>
      <div className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900">
        {icon}
        <span className={displayValue === 'Not set' || displayValue === 'Belum diisi' ? 'text-slate-500' : ''}>{displayValue}</span>
      </div>
    </div>
  )
}
