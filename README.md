# SleepGuard AR — Monitor Inteligente de Atenção

Projeto acadêmico de CRUD em Realidade Virtual (RV) e Realidade Aumentada (RA). Ele utiliza a webcam para identificar rosto, olhos e boca com **MediaPipe Face Landmarker**. Caso os olhos permaneçam fechados além do tempo configurado, registra uma ocorrência local, emite alerta visual/sonoro e notifica um celular pareado.

## Tecnologias

- HTML, CSS e JavaScript puro
- A-Frame.js: cartões de ocorrências na cena RV 3D
- AR.js: cartões no marcador Hiro em RA
- MediaPipe Face Landmarker: detecção de rosto, olhos e boca
- LocalStorage: CRUD das ocorrências
- Firebase Realtime Database: comunicação computador ↔ celular
- qrcode.js: QR Code de pareamento

## Estrutura

```text
sleepguard-ar/
├── index.html                    # Painel do computador
├── mobile.html                   # Configuração e alerta no celular
├── firebase-config.example.js    # Modelo seguro de configuração Firebase
├── css/style.css
└── js/
    ├── app.js                    # Interface, alerta, RV/RA e página mobile
    ├── crud.js                   # POST, GET, PATCH/PUT e DELETE no LocalStorage
    ├── face-detector.js          # MediaPipe Face Landmarker
    └── realtime.js               # Firebase Realtime Database
```

## Como rodar no GitHub Codespaces

1. Crie um repositório no GitHub e envie esta pasta para ele.
2. Abra o repositório em **Code > Create codespace on main**.
3. Copie `firebase-config.example.js` para `firebase-config.js` e preencha-o (passos abaixo).
4. Instale a extensão **Live Server** no VS Code, clique com o botão direito em `index.html` e escolha **Open with Live Server**.
5. Autorize o acesso à câmera no navegador. A webcam exige um endereço seguro (`https`) ou `localhost`; o Live Server do Codespaces já fornece uma URL apropriada.

Também é possível usar um servidor estático simples na pasta do projeto:

```bash
python3 -m http.server 8080
```

Depois abra a porta 8080 na aba **Ports** e defina a visibilidade como pública para testar com o celular.

## Configurar Firebase gratuito

O Firebase é usado somente para o pareamento e o evento de alerta. O CRUD permanece no LocalStorage do computador.

1. Acesse o [Firebase Console](https://console.firebase.google.com/) e crie um projeto no plano **Spark (gratuito)**.
2. Em **Build > Realtime Database**, crie uma base e escolha a região sugerida.
3. Para a demonstração acadêmica, em **Rules**, publique temporariamente:

```json
{
  "rules": {
    "sleepguard": { ".read": true, ".write": true }
  }
}
```

4. Em **Configurações do projeto > Seus apps**, registre um app Web e copie o objeto de configuração.
5. Faça uma cópia de `firebase-config.example.js` com o nome `firebase-config.js`, cole os valores e mantenha esse arquivo fora do Git se o repositório não for seu.

> As chaves de configuração do Firebase Web identificam o projeto, mas as **regras da base** são a proteção real. Para uma entrega pública, substitua as regras abertas por autenticação ou regras por sessão.

## Como testar o fluxo completo

1. Abra `index.html` no computador e clique em **Iniciar monitoramento**.
2. Aguarde o status “rosto detectado”. Os pontos roxos marcam olhos e boca.
3. Ajuste o controle de tempo (o padrão é 3 s).
4. Clique em **Conectar celular**. Um QR Code levará para `mobile.html` com o identificador da sessão.
5. No celular, selecione Bip, Mensagem falada, Áudio gravado ou Arquivo enviado. Para permitir reprodução após uma notificação, toque em **Ativar alertas no celular** pelo menos uma vez.
6. Feche os olhos por mais tempo que o limite ou clique em **Ocorrência de teste** para conferir os cartões RV/RA e a tabela.

Para testar a RA, clique em **Abrir RA** e aponte a câmera para o marcador [Hiro oficial](https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/hiro.png). Os cartões exibidos no marcador são as ocorrências do CRUD.

## CRUD implementado

`js/crud.js` separa as operações em funções:

- **POST**: `OccurrenceStore.create(data)`
- **GET**: `OccurrenceStore.getAll()`
- **PATCH/PUT**: `OccurrenceStore.update(id, patch)`
- **DELETE**: `OccurrenceStore.remove(id)`

Cada alteração atualiza imediatamente LocalStorage, tabela HTML, cartões A-Frame e cartões AR.js. No primeiro uso há uma ocorrência mockada para demonstrar a cena.

## Publicar no GitHub Pages

1. Envie os arquivos ao GitHub, incluindo `firebase-config.js` somente se aceitar que a configuração fique no site público.
2. No repositório, abra **Settings > Pages**.
3. Em **Build and deployment**, selecione **Deploy from a branch**.
4. Selecione a branch `main` e a pasta `/ (root)`; clique em **Save**.
5. Aguarde a URL informada pelo GitHub. O `index.html` abre automaticamente; o QR levará a `mobile.html` na mesma URL.

## Limitações importantes

- Este projeto é demonstrativo/educacional e não substitui sistema automotivo certificado ou avaliação médica.
- A precisão varia conforme iluminação, posição e qualidade da webcam.
- A reprodução de áudio em segundo plano ou com a tela bloqueada depende das regras do navegador e do sistema operacional. Por isso, abra a página mobile, teste o alerta e toque em **Ativar alertas no celular** antes do teste.
- Navegadores não permitem enviar automaticamente um arquivo de áudio local pelo Firebase. O áudio gravado/enviado fica no dispositivo; o Firebase envia apenas o comando do alerta.
