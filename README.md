<h1>ECHO APP</h1>
<b>Objetivo:</b> Reverberar o conteúdo aberto por um router, para os demais usuários logados na aplicação em uma mesma rede.

<b>Apresentação do Projeto</b><br>
Os prints exibidos, mostrará o conteúdo sendo utilizado na exibição da letra e cifra (que são os acordes) de uma determinada música, entretanto, há outras aplicabilidades para o app.<br>
Ex: Um professor (router), abre o conteúdo, e esse conteúdo é aberto na tela dos celulares dos alunos de forma automática, possibilitando ao aluno acompanhar o que o professor está lendo e explicando.<br><br>

<h2>Tela Admin</h2>
Através da tela Admin, acessada através de um browser, é possível realizar o cadastro do conteúdo. Na interface Web, também há outros controles e administrações possíveis.

- Tela principal da interface Web<br>
<img width="1832" height="981" alt="TelaInicial" src="https://github.com/user-attachments/assets/c2518564-ac86-4e09-81b4-fe42b922fb13" /><br>
<i>Página criada utilizando o flask.</i>
<br><br>

- Tela de cadastro da letra/cifra (aqui pode ser cadastrado o conteúdo da aula que o professor, como topicos, e o conteúdo que os alunos verão na tela do celular).<br>
<img width="1866" height="914" alt="TelaCadCifraMusica" src="https://github.com/user-attachments/assets/039e328f-56ae-4ffb-9eca-cee5d2160575" /><br>
<i>Nesta tela é possível criar atributos para o conteúdo cadastrado. No exemplo, utilizamos nome, tom, assuntos relacionados à música.</i><br><br>

- Tela de Administração de Acessos<br>
<img width="1869" height="910" alt="TelaAdminAcessos" src="https://github.com/user-attachments/assets/8cc3999b-1ad0-4c30-ab35-1e1cb9b0838e" /><br>
<i>Nesta tela é possível realizar o cadastro dos usuários, com nome ou login, e senha, além de atribuir o nível de permissão.</i><br>
  * <b>Router</b> - Este poderá fazer com que o conteúdo aberto, seja aberto em todos os demais usuários logados numa mesma rede.<br>
  * <b>Usuario</b> - Este poderá abrir o conteúdo, mas não poderá fazer com que o conteúdo seja aberto nos demais usuários logado na mesma rede.<br>
<img width="1359" height="556" alt="AdminUsuario" src="https://github.com/user-attachments/assets/458146bd-ff7f-4bb8-badd-24ddda8ab12c" /><br><br>

- Tela Log de Acessos<br>
Nesta tela é possível verificar os usuários logados e o que estão fazendo no sistema. Para ver o que estão fazendo, basta clicar no botão "ver log".
<img width="1436" height="458" alt="Captura de tela 2025-09-22 115445" src="https://github.com/user-attachments/assets/91b6f521-f10b-443f-987a-2b50af3f820a" /><br><br>

<h2>Interface Android/iOS</h2>
Abaixo, são as telas do App no smartphone.<br>

- Tela de Login<br>
<img width="1220" height="2712" alt="TelaLogin" src="https://github.com/user-attachments/assets/5c7b7dc7-b330-4706-9401-db04c2b8a8d6" /><br>
Clicando na engrenagem, é possível alterar o ip do servidor onde o app irá se conectar, possibilitando ao usuário, com o mesmo app utilizar para diferentes aplicabilidades. Ex: Usar para visualizar a letra de uma música
que está tocando em uma igreja, ou, acompanhar as aulas de um professor numa sala de aula.<br>
Atualmente, o app funciona inserindo o IP do servidor onde roda a aplicação, entretanto, o objetivo é criar o dns, para que seja possível acessar, utilizando o dns (endereço amigável) do servidor onde a aplicação está rodando.<br>
Ex: igrejaxpto.com ou saladeaula.com<br>
<img width="1220" height="881" alt="TelaIP" src="https://github.com/user-attachments/assets/8ea8d651-6821-47fb-9415-4709f9d7bc68" /><br><br>

- Tela com a lista de conteúdo<br>
Neste exemplo de aplicabilidade do app, caso o usuário selecione que é "músico", ao clicar na música, abrirá a cifra <i>(a lista de acordes, juntamente ao momento em que são executados junto à letra da música).</i>.<br>
Caso o usuário deixe desmarcado, ao clicar na letra da música, abrirá apenas a letra.
<img width="1220" height="2712" alt="TelaSelecaoMusica" src="https://github.com/user-attachments/assets/709904a9-68d4-49a4-bf3d-2e8561c6b170" />

<img width="1220" height="2712" alt="TelaMusica" src="https://github.com/user-attachments/assets/03da63ff-3d5d-4275-8ab1-c523e25d7b2c" /><br>
<i>Se não marcado a opção músico</i><br><br>
<img width="1220" height="2712" alt="telaCifra" src="https://github.com/user-attachments/assets/d6d0ef18-d21e-434f-80e8-5591b23f214e" />
<i>Se marcada a opção músico</i><br><br>

- Botão Reinvidicar<br>
<img width="1220" height="2712" alt="TelaSelectMusica" src="https://github.com/user-attachments/assets/66ec759d-59f5-42fe-8ab6-aef0d8ca47ea" /><br>
Este botão irá ser exibido apenas para os usuários que sejam cadastrados como router, lá na tela <i>Administração de Acessos</i>.<br>
Para que o conteúdo aberto pelo router, seja automaticamente aberto nos celulares dos demais usuários, o router precisa clicar em <b>reinvidicar</b>, ao fazer isso, quando o router abrir o conteúdo, ele irá abrir também
nos celulares dos demais usuários logados na mesma rede.<br>
Caso haja mais de um "router" logado no sistema, caso os dois cliquem no botão reinvidicar, concorrentemente, o botão ficará habilitado para o último que clicou em reinvidicar, removendo essa reinvidicação do anterior. Só é permitido,
um router com a reinvidicação solicitada numa mesma rede.

<h2>Melhorias futuras e em desenvolvimento</h2>
- Aplicação de recursos de acessibilidade para usuários com necessidades especiais. Como leitor automático do texto exibido.<br>
- Aplicação do logon e criação de usuário integrando às redes sociais.<br>




