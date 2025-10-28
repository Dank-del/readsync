import { createFileRoute, redirect } from '@tanstack/react-router'
import { pb } from '../lib/pb'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (pb.authStore.isValid) {
      throw redirect({
        to: '/dashboard',
      })
    } else {
      throw redirect({
        to: '/login',
      })
    }
  },
})
