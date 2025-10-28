import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import pb from '../lib/pb'

export function useAuth() {
  const [user, setUser] = useState(pb.authStore.record)
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_, record) => {
      setUser(record)
    })
    return unsubscribe
  }, [])

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      await pb.collection('users').authWithPassword(email, password)
    },
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })

  const signupMutation = useMutation({
    mutationFn: async ({ email, password, passwordConfirm }: { email: string; password: string; passwordConfirm: string }) => {
      await pb.collection('users').create({ email, password, passwordConfirm })
      await pb.collection('users').authWithPassword(email, password)
    },
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })

  const logout = () => {
    pb.authStore.clear()
    queryClient.clear()
  }

  return {
    user,
    login: loginMutation.mutateAsync,
    signup: signupMutation.mutateAsync,
    logout,
    isLoggingIn: loginMutation.isPending,
    isSigningUp: signupMutation.isPending,
    loginError: loginMutation.error,
    signupError: signupMutation.error,
  }
}