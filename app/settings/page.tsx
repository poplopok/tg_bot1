import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Bot, Shield, Bell, Database, Users, MessageSquare } from "lucide-react"

export default function Settings() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Bot className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Настройки EmoBot</h1>
          </div>
        </div>
      </header>

      <div className="p-6">
        <Tabs defaultValue="bot" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="bot">Бот</TabsTrigger>
            <TabsTrigger value="moderation">Модерация</TabsTrigger>
            <TabsTrigger value="notifications">Уведомления</TabsTrigger>
            <TabsTrigger value="integrations">Интеграции</TabsTrigger>
            <TabsTrigger value="teams">Команды</TabsTrigger>
          </TabsList>

          <TabsContent value="bot" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bot className="h-5 w-5" />
                    <span>Конфигурация бота</span>
                  </CardTitle>
                  <CardDescription>Основные настройки анализа эмоций</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bot-name">Имя бота</Label>
                    <Input id="bot-name" defaultValue="EmoBot" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="analysis-model">Модель анализа</Label>
                    <Select defaultValue="rubert-conversational">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rubert-conversational">RuBERT Conversational</SelectItem>
                        <SelectItem value="roberta-emotion">RoBERTa Emotion</SelectItem>
                        <SelectItem value="bert-multilingual">BERT Multilingual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Анализ в реальном времени</Label>
                      <p className="text-sm text-muted-foreground">Обрабатывать сообщения мгновенно</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Анализ эмодзи</Label>
                      <p className="text-sm text-muted-foreground">Учитывать эмодзи при анализе эмоций</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Обработка голосовых сообщений</Label>
                      <p className="text-sm text-muted-foreground">Конвертировать в текст и анализировать</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Пороги чувствительности</CardTitle>
                  <CardDescription>Настройка уровней срабатывания</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Агрессия (0-100)</Label>
                    <Input type="number" defaultValue="75" min="0" max="100" />
                    <p className="text-xs text-muted-foreground">Порог для обнаружения агрессивных сообщений</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Стресс (0-100)</Label>
                    <Input type="number" defaultValue="80" min="0" max="100" />
                    <p className="text-xs text-muted-foreground">Порог для обнаружения стрессовых состояний</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Сарказм (0-100)</Label>
                    <Input type="number" defaultValue="70" min="0" max="100" />
                    <p className="text-xs text-muted-foreground">Порог для обнаружения сарказма и иронии</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Токсичность (0-100)</Label>
                    <Input type="number" defaultValue="85" min="0" max="100" />
                    <p className="text-xs text-muted-foreground">Порог для блокировки токсичного контента</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="moderation" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Правила модерации</span>
                  </CardTitle>
                  <CardDescription>Автоматические действия при нарушениях</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Автоматическая блокировка</Label>
                      <p className="text-sm text-muted-foreground">Блокировать сообщения с высокой токсичностью</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Предупреждения пользователям</Label>
                      <p className="text-sm text-muted-foreground">Отправлять предупреждения в личные сообщения</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Архивация инцидентов</Label>
                      <p className="text-sm text-muted-foreground">Сохранять все нарушения для расследований</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="blocked-words">Запрещенные слова</Label>
                    <Textarea
                      id="blocked-words"
                      placeholder="Введите слова через запятую..."
                      defaultValue="дурак, идиот, тупой"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Эскалация инцидентов</CardTitle>
                  <CardDescription>Когда уведомлять руководство</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="destructive">Критический</Badge>
                        <Switch defaultChecked />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Немедленно уведомлять HR при агрессии или дискриминации
                      </p>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="default">Высокий</Badge>
                        <Switch defaultChecked />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Уведомлять руководителя отдела при повторных нарушениях
                      </p>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary">Средний</Badge>
                        <Switch />
                      </div>
                      <p className="text-sm text-muted-foreground">Еженедельные отчеты о негативных трендах</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Настройки уведомлений</span>
                </CardTitle>
                <CardDescription>Управление оповещениями для разных ролей</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">HR-менеджеры</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Критические инциденты</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Еженедельные отчеты</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Тренды по командам</Label>
                        <Switch />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Руководители отделов</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Проблемы в команде</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Снижение морали</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Рекомендации</Label>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Администраторы</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Системные ошибки</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Обновления модели</Label>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Статистика обработки</Label>
                        <Switch />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium">Каналы уведомлений</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email для критических уведомлений</Label>
                      <Input id="email" type="email" defaultValue="hr@company.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telegram">Telegram-канал для отчетов</Label>
                      <Input id="telegram" defaultValue="@company_hr_reports" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>HR-системы</span>
                  </CardTitle>
                  <CardDescription>Интеграция с системами управления персоналом</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">BambooHR</p>
                        <p className="text-xs text-muted-foreground">Синхронизация данных о сотрудниках</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="default">Подключено</Badge>
                        <Button size="sm" variant="outline">
                          Настроить
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">PeopleForce</p>
                        <p className="text-xs text-muted-foreground">Данные о вовлеченности и eNPS</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">Не подключено</Badge>
                        <Button size="sm">Подключить</Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Workday</p>
                        <p className="text-xs text-muted-foreground">Интеграция с системой управления талантами</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">Не подключено</Badge>
                        <Button size="sm">Подключить</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>Мессенджеры</span>
                  </CardTitle>
                  <CardDescription>Подключенные чаты для мониторинга</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Telegram</p>
                        <p className="text-xs text-muted-foreground">23 активных чата</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="default">Активно</Badge>
                        <Button size="sm" variant="outline">
                          Управлять
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Slack</p>
                        <p className="text-xs text-muted-foreground">Готов к подключению</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">Не подключено</Badge>
                        <Button size="sm">Подключить</Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Microsoft Teams</p>
                        <p className="text-xs text-muted-foreground">Готов к подключению</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">Не подключено</Badge>
                        <Button size="sm">Подключить</Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">API настройки</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Telegram Bot Token</Label>
                        <Button size="sm" variant="outline">
                          Обновить
                        </Button>
                      </div>
                      <Input type="password" defaultValue="••••••••••••••••" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="teams" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Управление командами</span>
                </CardTitle>
                <CardDescription>Настройка мониторинга по отделам и группам</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { name: "Разработка", members: 12, chats: 3, status: "active" },
                    { name: "Маркетинг", members: 8, chats: 2, status: "active" },
                    { name: "Продажи", members: 15, chats: 4, status: "active" },
                    { name: "HR", members: 5, chats: 1, status: "active" },
                    { name: "Поддержка", members: 10, chats: 2, status: "warning" },
                    { name: "Финансы", members: 6, chats: 1, status: "inactive" },
                  ].map((team) => (
                    <div key={team.name} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">{team.name}</h3>
                        <Badge
                          variant={
                            team.status === "active"
                              ? "default"
                              : team.status === "warning"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {team.status === "active" ? "Активно" : team.status === "warning" ? "Внимание" : "Неактивно"}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>{team.members} сотрудников</p>
                        <p>{team.chats} чатов</p>
                      </div>
                      <div className="flex space-x-2 mt-3">
                        <Button size="sm" variant="outline">
                          Настроить
                        </Button>
                        <Button size="sm" variant="outline">
                          Отчет
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">Добавить новую команду</h3>
                    <p className="text-sm text-muted-foreground">Создать группу для мониторинга</p>
                  </div>
                  <Button>Добавить команду</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-3 mt-8">
          <Button variant="outline">Отменить</Button>
          <Button>Сохранить настройки</Button>
        </div>
      </div>
    </div>
  )
}
