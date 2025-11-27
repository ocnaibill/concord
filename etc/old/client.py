import socket

# Define o host e a porta do servidor
HOST = "127.0.0.1"
PORT = 65432

# Cria o socket do cliente
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    try:
        # Tenta se conectar ao servidor
        s.connect((HOST, PORT))
    except ConnectionRefusedError:
        print("Erro: A conexão foi recusada. O servidor está offline ou a porta está errada.")
        exit() # Encerra o programa se não conseguir nem conectar

    # 1. Logo após conectar, espera uma resposta inicial do servidor.
    #    Isso vai nos dizer se a conexão foi aceita ou se o servidor está ocupado.
    resposta_inicial = s.recv(1024).decode('utf-8').strip()

    # 2. Verifica a resposta inicial.
    if resposta_inicial.startswith("ERRO:"):
        print(f"Não foi possível conectar: {resposta_inicial}")
    else:
        print(f"Servidor disse: '{resposta_inicial}'")
        print("Digite 'QUIT' para sair.")
        
        while True:
            # Pede ao usuário para digitar uma mensagem
            msg = input("Por favor, digite sua mensagem: ")

            try:
                # Envia a mensagem com '\n' e codificada em UTF-8
                s.sendall(f"{msg}\n".encode('utf-8'))

                # Verifica se o usuário quer encerrar a sessão
                if msg.upper() == 'QUIT':
                    print("Encerrando a conexão.")
                    break

                # Espera pela resposta do servidor (eco)
                data = s.recv(1024)
                if not data: # Se o servidor fechar a conexão
                    print("O servidor encerrou a conexão.")
                    break

                resposta_servidor = data.decode('utf-8').strip()
                print(f"Resposta do servidor: '{resposta_servidor}'")

            except (BrokenPipeError, ConnectionResetError):
                print("Erro: A conexão com o servidor foi perdida.")
                break


print("Cliente desconectado.")