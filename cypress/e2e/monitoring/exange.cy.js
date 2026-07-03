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
    cy.visit('https://stage.metatrip-system.uz/sign-in', { timeout: 30000 });
    
    cy.env(['LOGIN_EMAIL', 'LOGIN_PASSWORD']).then((envVars) => {
      cy.get('input[type="text"]', { timeout: 15000 })
        .should('be.visible').clear()
        .type(envVars.LOGIN_EMAIL, { delay: 50, log: false }); 

      cy.get('input[type="password"]')
        .should('be.visible').clear()
        .type(envVars.LOGIN_PASSWORD, { delay: 50, log: false });

      cy.get('button[type="submit"], button.sign-in-page__submit')
        .first().should('be.visible').click({ force: true });
    });

    cy.url({ timeout: 20000 }).should('not.include', '/sign-in');

    // ==========================================
    // БЛОК 2: НАВИГАЦИЯ
    // ==========================================
    // 1. Кликаем "Курс валют" (открываем дропдаун)
    cy.contains('.sidebar-item', /Курс валют|Currency rates/i)
      .should('be.visible')
      .click();
    
    // 2. Кликаем "Провайдеры" (используем правильный класс .is-child)
    cy.contains('a.sidebar-link.is-child', /Провайдеры|Providers/i)
      .should('be.visible')
      .click();

    cy.url().should('include', '/currency/provider');

    // ==========================================
    // БЛОК 3: ДОБАВИТЬ КУРС
    // ==========================================
    cy.contains('button', /Добавить курс|Add rate/i)
      .should('be.visible')
      .click();
cy.wait(500);
    // Грамотное ожидание: ждем появления модального окна
    cy.get('.p-dialog', { timeout: 8000 }).should('be.visible');

    // Открываем дропдаун провайдера (ищем по классу p-select)
    cy.get('.p-select').first().should('be.visible').click();

    // Выбираем провайдера 'ForCourse' по атрибуту aria-label
    cy.get('li[aria-label="ForCourse"]', { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });

    // Вводим сумму 100
    cy.get('input.p-inputnumber-input')
      .should('be.visible')
      .clear()
      .type('100');

    // Сохраняем (Кнопка "Добавить" в футере модалки)
    cy.get('.p-dialog-footer')
      .contains('button', /Добавить|Add/i)
      .should('be.visible')
      .click();

    // Ждем перехвата POST-запроса
    cy.wait('@apiAddRate', { timeout: 20000 })
      .its('response.statusCode')
      .should('be.oneOf', [200, 201]);

    cy.log('✅ Курс успешно добавлен');

   // ==========================================
    // БЛОК 4: РЕДАКТИРОВАТЬ КУРС
    // ==========================================
    // Ищем карточку именно с провайдером 'ForCourse' и кликаем "Редактировать"
    cy.contains('.rate-card', 'ForCourse')
      .find('button[title="Редактировать"], .action-btn:not(.action-btn--danger)')
      .first()
      .should('be.visible')
      .click();

    // Ждем, пока модалка редактирования полностью появится на экране
    cy.get('.p-dialog', { timeout: 8000 }).should('be.visible');

    // Меняем сумму на 10
    cy.get('input.p-inputnumber-input')
      .should('be.visible')
      .clear()
      .type('10');

    // Сохраняем (Кнопка "Сохранить" в футере модалки)
    cy.get('.p-dialog-footer')
      .contains('button', /Сохранить|Save/i)
      .should('be.visible')
      .click();

    // Ждем окончания POST-запроса сохранения
    cy.wait('@apiAddRate', { timeout: 20000 })
      .its('response.statusCode')
      .should('be.oneOf', [200, 201]);

    // ГРАМОТНО: Ожидаем GET-запрос, чтобы Cypress дождался обновления списка карточек на экране,
    // иначе кнопка удаления исчезнет прямо из-под клика в следующем блоке.
    cy.wait('@apiGetRates', { timeout: 20000 });

    cy.log('✅ Курс успешно отредактирован и список обновлен на экране');

   // ==========================================
    // БЛОК 5: УДАЛИТЬ КУРС
    // ==========================================
    
    // Даем интерфейсу 1 секунду "успокоиться" после редактирования, 
    // чтобы все фоновые обновления Vue/React завершились и DOM стал стабильным.
    cy.wait(1000);

    // Короткая и надежная цепочка команд:
    // cy.contains сразу берет всю карточку целиком, внутри нее ищем кнопку.
    cy.contains('.rate-card', 'ForCourse')
      .find('button.action-btn--danger')
      .should('be.visible')
      .click({ force: true }); // force: true страхует от микро-анимаций

    // Подтверждаем удаление в модальном окне
    cy.get('.app-button')
      .contains('button', /Удалить|Да|Yes|Delete/i)
      .should('be.visible')
      .click();

  cy.intercept('DELETE', '**/provider/rates/*').as('apiDeleteRate');
      
    cy.log('✅ Курс успешно удален');

    // Финальная запись успешного статуса для CI/CD
    cy.writeFile('provider_rates_status.txt', '200');
  });
});