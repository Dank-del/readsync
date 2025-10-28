import { createFileRoute } from '@tanstack/react-router'
import { Reader } from '../components/Reader'

export const Route = createFileRoute('/reader/$id')({
  component: Reader,
})