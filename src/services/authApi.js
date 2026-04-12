import {
  canUseSupabase,
  ensureSupabaseClient,
  getSupabaseConfig
} from '@/services/supabaseBridge'
import { createAppError } from '@/utils/appError'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const LOCAL_USER_STORAGE_KEY = 'campus-link-local-user'
const createAuthResult = ({ user = null, noticeCode = '', pendingEmail = '' } = {}) => ({
  user,
  noticeCode,
  pendingEmail
})

const getEmailRedirectTo = () => {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return undefined
  }

  return window.location.origin
}

const normalizeUser = (record) => ({
  id: record.id || 'guest-user',
  email: record.email || '',
  name: record.name || record.full_name || record.username || '你',
  role: record.role || record.headline || '大学生',
  avatar:
    record.avatar ||
    record.avatar_url ||
    (record.name || record.full_name || record.email || 'Y').slice(0, 1).toUpperCase()
})

const createLocalUserId = (email = '') => {
  const normalizedEmail = email.trim().toLowerCase()
  const safeEmail = normalizedEmail.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

  return `local-${safeEmail || 'user'}`
}

const readStoredLocalUser = () => {
  if (typeof localStorage === 'undefined') {
    return null
  }

  try {
    const saved = localStorage.getItem(LOCAL_USER_STORAGE_KEY)

    if (!saved) {
      return null
    }

    return normalizeUser(JSON.parse(saved))
  } catch (error) {
    console.warn('Unable to restore local auth cache.', error)
    return null
  }
}

const writeStoredLocalUser = (user) => {
  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    localStorage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(user))
  } catch (error) {
    console.warn('Unable to persist local auth cache.', error)
  }
}

const clearStoredLocalUser = () => {
  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    localStorage.removeItem(LOCAL_USER_STORAGE_KEY)
  } catch (error) {
    console.warn('Unable to clear local auth cache.', error)
  }
}

let localUser = readStoredLocalUser()

const getProfileForUser = async (userId) => {
  const client = await ensureSupabaseClient()
  const config = getSupabaseConfig()
  const { data, error } = await client
    .from(config.profilesTable)
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw createAppError('authLoadProfile', error.message)
  }

  return data
}

const upsertProfileForUser = async ({ user, name, role }) => {
  const client = await ensureSupabaseClient()
  const config = getSupabaseConfig()
  const fullName = name || user.user_metadata?.full_name || user.email || '用户'
  const headline = role || user.user_metadata?.headline || '大学生'
  const avatar = fullName.slice(0, 1).toUpperCase()

  const payload = {
    id: user.id,
    full_name: fullName,
    headline,
    avatar_url: avatar
  }

  const { error } = await client.from(config.profilesTable).upsert(payload, {
    onConflict: 'id'
  })

  if (error) {
    throw createAppError('authSaveProfile', error.message)
  }

  return payload
}

export const fetchCurrentUser = async () => {
  if (canUseSupabase()) {
    const client = await ensureSupabaseClient()
    const {
      data: { user },
      error
    } = await client.auth.getUser()

    if (error) {
      throw createAppError('authReadSupabaseUser', error.message)
    }

    if (!user) {
      return null
    }

    let profile = await getProfileForUser(user.id)

    if (!profile) {
      profile = await upsertProfileForUser({ user })
    }

    return normalizeUser({
      id: user.id,
      email: user.email,
      name: profile.full_name || user.email || '已登录用户',
      role: profile.headline || '大学生',
      avatar: profile.avatar_url || (user.email || 'S').slice(0, 1).toUpperCase()
    })
  }

  await wait(60)
  return localUser ? { ...localUser } : null
}

export const signInLocally = async (payload) => {
  if (canUseSupabase()) {
    const client = await ensureSupabaseClient()
    const emailRedirectTo = getEmailRedirectTo()

    if (payload.mode === 'signup') {
      const { data, error } = await client.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          ...(emailRedirectTo ? { emailRedirectTo } : {}),
          data: {
            full_name: payload.name,
            headline: payload.role
          }
        }
      })

      if (error) {
        throw createAppError('authSignUp', error.message)
      }

      if (!data.user) {
        throw createAppError('authNoUserReturned')
      }

      if (!data.session) {
        return createAuthResult({
          noticeCode: 'authEmailConfirmRequired',
          pendingEmail: payload.email
        })
      }

      await upsertProfileForUser({
        user: data.user,
        name: payload.name,
        role: payload.role
      })

      return createAuthResult({
        user: await fetchCurrentUser()
      })
    }

    const { error } = await client.auth.signInWithPassword({
      email: payload.email,
      password: payload.password
    })

    if (error) {
      throw createAppError('authSignIn', error.message)
    }

    return createAuthResult({
      user: await fetchCurrentUser()
    })
  }

  await wait(80)
  const normalizedEmail = payload.email.trim().toLowerCase()
  const previousLocalUser =
    localUser?.email?.trim().toLowerCase() === normalizedEmail ? localUser : null

  localUser = normalizeUser({
    id: previousLocalUser?.id || createLocalUserId(normalizedEmail),
    email: payload.email,
    name: payload.name || previousLocalUser?.name || '你',
    role: payload.role || previousLocalUser?.role || '大学生',
    avatar:
      payload.name?.slice(0, 1).toUpperCase() ||
      previousLocalUser?.avatar ||
      (payload.email || 'Y').slice(0, 1).toUpperCase()
  })
  writeStoredLocalUser(localUser)
  return createAuthResult({
    user: { ...localUser }
  })
}

export const signOutLocally = async () => {
  if (canUseSupabase()) {
    const client = await ensureSupabaseClient()
    const { error } = await client.auth.signOut()

    if (error) {
      throw createAppError('authSignOut', error.message)
    }

    return createAuthResult()
  }

  await wait(50)
  localUser = null
  clearStoredLocalUser()
  return createAuthResult()
}

export const resendSignupConfirmation = async (email) => {
  const nextEmail = email.trim()

  if (!nextEmail) {
    throw createAppError('authMissingVerificationEmail', 'Please enter your email address.')
  }

  if (!canUseSupabase()) {
    await wait(50)
    return createAuthResult({
      noticeCode: 'authResendConfirmationSuccess',
      pendingEmail: nextEmail
    })
  }

  const client = await ensureSupabaseClient()
  const emailRedirectTo = getEmailRedirectTo()
  const { error } = await client.auth.resend({
    type: 'signup',
    email: nextEmail,
    options: emailRedirectTo ? { emailRedirectTo } : undefined
  })

  if (error) {
    throw createAppError('authResendConfirmation', error.message)
  }

  return createAuthResult({
    noticeCode: 'authResendConfirmationSuccess',
    pendingEmail: nextEmail
  })
}
