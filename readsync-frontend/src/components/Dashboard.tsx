import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../hooks/useAuth'
import { pb } from '../lib/pb'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as pdfjsLib from 'pdfjs-dist'
import { ChevronRight, Upload, BookOpen, User, LogOut } from 'lucide-react'

export function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data: documents, refetch } = useQuery({
    queryKey: ['documents', user?.id],
    queryFn: () => pb.collection('documents').getList(1, 50, { filter: `owner = "${user?.id}"` }),
    enabled: !!user,
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name?: string; avatar?: File }) => {
      const formData = new FormData()
      if (data.name) formData.append('name', data.name)
      if (data.avatar) formData.append('avatar', data.avatar)
      return pb.collection('users').update(user!.id, formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', user?.id] })
      setIsDialogOpen(false)
    },
  })

  const handleFileChange = async (file: File | null) => {
    setUploadFile(file)
    if (file) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const metadata = await pdf.getMetadata()
        const info = metadata.info as any
        setName(info?.Title || file.name.replace('.pdf', ''))
        setDescription(info?.Subject || (info?.Author ? `By ${info.Author}` : ''))
      } catch (error) {
        console.error('Error extracting PDF metadata:', error)
        setName(file.name.replace('.pdf', ''))
        setDescription('')
      }
    } else {
      setName('')
      setDescription('')
    }
  }

  const handleUpload = async () => {
    if (!uploadFile || !name) return
    const formData = new FormData()
    formData.append('document', uploadFile)
    formData.append('name', name)
    formData.append('description', description)
    formData.append('owner', user!.id)
    await pb.collection('documents').create(formData)
    refetch()
    setUploadFile(null)
    setName('')
    setDescription('')
  }

  const profileForm = useForm({
    defaultValues: {
      name: user?.name || '',
      avatar: null as File | null,
    },
    onSubmit: async ({ value }) => {
      await updateProfileMutation.mutateAsync({
        name: value.name,
        avatar: value.avatar || undefined,
      })
    },
  })

  const handleDialogOpen = (open: boolean) => {
    setIsDialogOpen(open)
    if (open) {
      profileForm.reset()
    }
  }

  if (!user) {
    navigate({ to: '/login' })
    return null
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl relative">
        {/* Logout Button - Top Right Corner */}
        <div className="absolute top-0 right-0 z-10">
          <Button
            onClick={logout}
            variant="ghost"
            size="sm"
            className="min-h-9 px-3 text-sm hover:bg-destructive hover:text-destructive-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Header */}
        <div className="mb-6 pt-2">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">ReadSync</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Welcome back, {user.name || user.email}!
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="mb-6">
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:bg-accent/50 transition-colors active:scale-[0.98] touch-manipulation">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="shrink-0">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
                      <AvatarImage src={user.avatar ? pb.files.getUrl(user, user.avatar) : undefined} />
                      <AvatarFallback className="text-lg">
                        {user.name?.[0] || user.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {user.name || 'No name set'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className="shrink-0 text-muted-foreground">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="sm:mx-auto sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-xl">Edit Profile</DialogTitle>
                <DialogDescription className="text-sm">
                  Update your profile information.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  profileForm.handleSubmit()
                }}
                className="space-y-4 pt-4"
              >
                <profileForm.Field
                  name="name"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name} className="text-sm font-medium">
                        Name
                      </Label>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="min-h-11 text-base"
                        autoComplete="name"
                      />
                    </div>
                  )}
                />
                <profileForm.Field
                  name="avatar"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name} className="text-sm font-medium">
                        Avatar
                      </Label>
                      <Input
                        id={field.name}
                        type="file"
                        accept="image/*"
                        onChange={(e) => field.handleChange(e.target.files?.[0] || null)}
                        className="min-h-11 text-base file:text-sm file:font-medium"
                      />
                    </div>
                  )}
                />
                <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end sm:space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="min-h-11 text-base"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="min-h-11 text-base"
                  >
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Upload Form */}
        <div className="mb-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload New Document
              </CardTitle>
              <CardDescription className="text-sm">
                Add a new PDF document to your library.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter document name"
                  className="min-h-11 text-base"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description (Optional)
                </Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description"
                  className="min-h-11 text-base"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="file" className="text-sm font-medium">
                  PDF File
                </Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  className="min-h-11 text-base file:text-sm file:font-medium"
                />
              </div>
              <Button
                onClick={handleUpload}
                disabled={!uploadFile || !name}
                className="w-full min-h-11 text-base font-medium"
                size="lg"
              >
                Upload Document
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Documents Grid */}
        <div>
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Your Documents
              </CardTitle>
              <CardDescription className="text-sm">
                View and read your uploaded documents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!documents?.items.length ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📚</div>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    No documents yet. Upload your first PDF above!
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {documents.items.map((doc) => (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow active:scale-[0.98] touch-manipulation">
                      <CardHeader className="pb-3">
                        <div className="relative overflow-hidden">
                          <CardTitle
                            className={`text-lg leading-tight whitespace-nowrap ${
                              doc.name.length > 20 ? 'animate-marquee' : ''
                            }`}
                          >
                            {doc.name}
                          </CardTitle>
                        </div>
                        {doc.description && (
                          <CardDescription className="text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                            {doc.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Button
                          onClick={() => navigate({ to: `/reader/${doc.id}` })}
                          className="w-full min-h-11 text-base font-medium"
                          size="lg"
                        >
                          Read Document
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}