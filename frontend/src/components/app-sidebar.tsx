import { useMemo } from "react"
import { Calendar, Home, Inbox, Settings, User2, LogOut, Users as UsersIcon, ClipboardList, Command, ChevronsUpDown, User, Monitor, FileBarChart, PlusCircle, Shield } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/context/AuthContext"

// Menu items configuration
const MENU_ITEMS = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Guarita",
    url: "/guardhouse/dashboard",
    icon: Shield,
  },
  {
    title: "Relatórios",
    url: "/reports",
    icon: FileBarChart,
  },
  {
    title: "Visitas",
    url: "/visits",
    icon: ClipboardList,
  },
  {
    title: "Nova Visita",
    url: "/visits/new",
    icon: PlusCircle,
  },
  {
    title: "Visitantes",
    url: "/visitors",
    icon: User2,
  },
  {
    title: "Departamentos",
    url: "/departments",
    icon: Inbox,
  },
  {
    title: "Agenda",
    url: "/calendar",
    icon: Calendar,
  },
  {
    title: "Totem",
    url: "/totem",
    icon: Monitor,
  },
  {
    title: "Configurações",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const isRouteActive = (url: string) => {
    if (url === '/guardhouse/dashboard') {
      return location.pathname.startsWith('/guardhouse')
    }
    return location.pathname === url
  }

  const userInitials = useMemo(() => {
    if (!user?.name) return 'U'
    const names = user.name.split(' ')
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase()
    return (names[0][0] + names[names.length - 1][0]).toUpperCase()
  }, [user])

  const filteredItems = useMemo(() => {
    // Clone items
    let items = [...MENU_ITEMS]
    
    // Show "Nova Visita" only for roles allowed to create visits
    const canCreateVisit = ['ADMIN', 'RECEPCIONISTA', 'COLABORADOR'].includes(user?.role ?? '')
    if (!canCreateVisit) {
      items = items.filter(item => item.url !== '/visits/new')
    }
    
    // Add Admin-only items
    if (user?.role === 'ADMIN') {
      items.splice(5, 0, { // Insert after Visitantes
        title: "Usuários",
        url: "/users",
        icon: UsersIcon,
      })
    }
    
    // Filter for Colaborador
    if (user?.role === 'COLABORADOR') {
        // Remove restricted items for Colaborador
        items = items.filter(item => 
          item.url !== '/visitors' && 
          item.url !== '/totem' &&
          item.url !== '/reports'
        );
    }
    
    // Filter for Recepcionista
    if (user?.role === 'RECEPCIONISTA') {
        items = items.filter(item => item.url !== '/reports');
    }
    
    return items
  }, [user?.role])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Command className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Gestão de Visitas</span>
            <span className="truncate text-xs">Enterprise</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isRouteActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-medium">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name}</span>
                    <span className="truncate text-xs text-muted-foreground capitalize">{user?.role?.toLowerCase()}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-medium">{userInitials}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user?.email || (user?.matricula ? `Matrícula ${user.matricula}` : 'Sem e-mail')}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer flex w-full items-center gap-2">
                        <User className="size-4" />
                        Perfil
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-500 focus:text-red-500 cursor-pointer">
                  <LogOut className="mr-2 size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
