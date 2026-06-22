import { redirect } from 'next/navigation'

type AcceptInvitationPageProps = {
  searchParams: Promise<{
    __clerk_ticket?: string
    __clerk_status?: string
  }>
}

export default async function AcceptInvitationPage({
  searchParams,
}: AcceptInvitationPageProps) {
  const params = await searchParams
  const ticket = params.__clerk_ticket
  const status = params.__clerk_status

  if (!ticket) {
    redirect('/sign-in')
  }

  const query = new URLSearchParams()
  query.set('__clerk_ticket', ticket)
  if (status) {
    query.set('__clerk_status', status)
  }

  const target = status === 'sign_in' ? '/sign-in' : '/sign-up'
  redirect(`${target}?${query.toString()}`)
}
