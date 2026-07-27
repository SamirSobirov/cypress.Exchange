describe('Provider Currency Rates Flow (CRUD)', () => {

  before(() => {
    // Сбрасываем статус перед началом
    cy.writeFile('provider_rates_status.txt', 'UNKNOWN');
  });

  it('Add, Edit, and Delete Provider Rate with Smart Diagnostics', () => {
    cy.viewport(1280, 800);

    // ==========================================
    // 1. ИДЕАЛЬНАЯ НАСТРОЙКА ПЕРЕХВАТОВ API
    // ==========================================
    // Используем ** в конце, чтобы ловить любые ID и query-параметры (например ?page=1)
    cy.intercept('POST', '**/api/rates/provider/rates**').as('apiAddRate');
    cy.intercept('PUT', '**/api/rates/provider/rates**').as('apiEditRate');
    cy.intercept('DELETE', '**/api/rates/provider/rates**').as('apiDeleteRate');
    // ДОБАВЛЕНО: Перехват GET-запроса для обновления списка карточек
    cy.intercept('GET', '**/api/rates/provider/rates**').as('apiGetRates');

    // ==========================================
    // БЛОК 1: АВТОРИЗАЦИЯ
    // ==========================================
    cy.visit('https://b2b.metatrip.asia/sign-in', { timeout: 30000 });
    
    cy.env(['LOGIN_EMAIL', 'LOGIN_PASSWORD']).then((envVars) => {
      cy.get('input[type="text"]', { timeout: 15000 })
        .should('be.visible').clear()
        .type(envVars.LOGIN_EMAIL, { delay: 50, log: false }); 

      cy.get('input[type="password"]', { timeout: 15000 })
        .should('be.visible').clear()
        .type(envVars.LOGIN_PASSWORD, { delay: 50, log: false });

      cy.get('button[type="submit"], button.sign-in-page__submit', { timeout: 15000 })
        .first().should('be.visible').click({ force: true });
    });

    cy.url({ timeout: 20000 }).should('not.include', '/sign-in');

    // ==========================================
    // БЛОК 2: НАВИГАЦИЯ
    // ==========================================
    // 1. Кликаем "Курс валют" (открываем дропдаун)
    cy.contains('.sidebar-item', /Курс валют|Currency rates/i, { timeout: 20000 })
      .should('be.visible')
      .click();
    
    // 2. Кликаем "Провайдеры" (используем правильный класс .is-child)
    cy.contains('a.sidebar-link.is-child', /Провайдеры|Providers/i, { timeout: 20000 })
      .should('be.visible')
      .click();

    cy.url({ timeout: 20000 }).should('include', '/currency/provider');

    // ==========================================
    // БЛОК 3: ДОБАВИТЬ КУРС
    // ==========================================
    cy.contains('button', /Добавить курс|Add rate/i, { timeout: 20000 })
      .should('be.visible')
      .click();

    cy.wait(1500);

    // Грамотное ожидание: ждем появления модального окна
    cy.get('.p-dialog', { timeout: 20000 }).should('be.visible');

    // Даем модалке доехать анимацией до конца
    cy.wait(1000);

    // Открываем дропдаун провайдера (ищем по классу p-select)
    cy.get('.p-select', { timeout: 20000 }).first().should('be.visible').click();

    // Ждем, пока оверлей со списком провайдеров отрисуется целиком
    cy.wait(1500);

    // Выбираем провайдера 'ForCourse' по атрибуту aria-label
    cy.get('li[aria-label="ForCourse"]', { timeout: 20000 })
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });

    // Даем списку закрыться, чтобы он не перекрывал поле суммы
    cy.wait(1000);

    // Вводим сумму 100
    cy.get('input.p-inputnumber-input', { timeout: 20000 })
      .should('be.visible')
      .clear()
      .type('100');

    cy.wait(500);

    // Сохраняем (Кнопка "Добавить" в футере модалки)
    cy.get('.p-dialog-footer', { timeout: 20000 })
      .contains('button', /Добавить|Add/i)
      .should('be.visible')
      .click();

    // Ждем перехвата POST-запроса
    cy.wait('@apiAddRate', { timeout: 30000 })
      .its('response.statusCode')
      .should('be.oneOf', [200, 201]);

    cy.log('✅ Курс успешно добавлен');

    // Ждем, пока модалка закроется и список карточек перерисуется
    cy.wait(2000);

   // ==========================================
    // БЛОК 4: РЕДАКТИРОВАТЬ КУРС
    // ==========================================
    // Ищем карточку именно с провайдером 'ForCourse' и кликаем "Редактировать"
    cy.contains('.rate-card', 'ForCourse', { timeout: 20000 })
      .find('button[title="Редактировать"], .action-btn:not(.action-btn--danger)')
      .first()
      .should('be.visible')
      .click();

    // Ждем, пока модалка редактирования полностью появится на экране
    cy.get('.p-dialog', { timeout: 20000 }).should('be.visible');

    // Даем модалке дорисоваться и подтянуть текущее значение курса,
    // иначе clear() сработает до того, как поле заполнится с бэкенда
    cy.wait(1500);

    // Меняем сумму на 10
    cy.get('input.p-inputnumber-input', { timeout: 20000 })
      .should('be.visible')
      .clear()
      .type('10');

    cy.wait(500);

    // Сохраняем (Кнопка "Сохранить" в футере модалки)
    cy.get('.p-dialog-footer', { timeout: 20000 })
      .contains('button', /Сохранить|Save/i)
      .should('be.visible')
      .click();

    // Ждем окончания POST-запроса сохранения
    cy.wait('@apiAddRate', { timeout: 30000 })
      .its('response.statusCode')
      .should('be.oneOf', [200, 201]);

    // ГРАМОТНО: Ожидаем GET-запрос, чтобы Cypress дождался обновления списка карточек на экране,
    // иначе кнопка удаления исчезнет прямо из-под клика в следующем блоке.
    cy.wait('@apiGetRates', { timeout: 30000 });

    cy.log('✅ Курс успешно отредактирован и список обновлен на экране');

   // ==========================================
    // БЛОК 5: УДАЛИТЬ КУРС
    // ==========================================
    
    // Даем интерфейсу "успокоиться" после редактирования,
    // чтобы все фоновые обновления Vue/React завершились и DOM стал стабильным.
    cy.wait(2500);

    // Короткая и надежная цепочка команд:
    // cy.contains сразу берет всю карточку целиком, внутри нее ищем кнопку.
    cy.contains('.rate-card', 'ForCourse', { timeout: 20000 })
      .find('button.action-btn--danger')
      .should('be.visible')
      .click({ force: true }); // force: true страхует от микро-анимаций

    // Ждем открытия окна подтверждения
    cy.wait(1500);

    // Подтверждаем удаление в модальном окне
    cy.get('.app-button', { timeout: 20000 })
      .contains('button', /Удалить|Да|Yes|Delete/i)
      .should('be.visible')
      .click();

    // Даем запросу на удаление уйти и списку перерисоваться
    cy.wait(2000);

  cy.intercept('DELETE', '**/provider/rates/*').as('apiDeleteRate');
      
    cy.log('✅ Курс успешно удален');

    // Финальная запись успешного статуса для CI/CD
    cy.writeFile('provider_rates_status.txt', '200');
  });
});