import socket
import threading

# Define o host como localhost e a porta
HOST = "0.0.0.0" # Aceita conexões de qualquer interface
PORT = 65432 # Porta escolhida



def handle_client(conn, addr):
    """
    Função que será executada em uma nova thread para cada cliente.
    """
    print(f"Nova conexão de {addr}")

    # Envia uma mensagem de boas-vindas para o cliente saber que conectou
    conn.sendall("Conexão estabelecida. Bem-vindo!\n".encode('utf-8'))
    # O 'with' garante que a conexão será fechada ao final do bloco
    with conn:
        while True:
            # Espera por dados do cliente (até 1024 bytes)
            data = conn.recv(1024)
            if not data:
                print(f"Cliente {addr} desconectou inesperadamente.")
                break

            mensagem_cliente = data.decode('utf-8').strip()
            print(f"Recebido de {addr}: '{mensagem_cliente}'")

            if mensagem_cliente == 'QUIT':
                print(f"Comando QUIT recebido de {addr}.")
                break

            # Envia a mesma mensagem de volta para o cliente (eco)
            conn.sendall(data)
    # 3. CRÍTICO: Conexão com o cliente encerrada.
    print(f"Conexão com {addr} encerrada.")

# Cria o socket do servidor
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.bind((HOST, PORT))
    s.listen()
    print(f"Servidor escutando em {HOST}:{PORT}")

    #  Loop principal do servidor para aceitar conexões continuamente.
    while True:
        # Aceita uma nova conexão (bloqueante)
        conn, addr = s.accept()
        
        #    Cria e inicia uma nova thread para cuidar do cliente recém-conectado.
        #    O servidor principal volta imediatamente para o s.accept() para
        #    esperar por novas conexões (que poderão ser rejeitadas se a trava estiver ocupada).
        client_thread = threading.Thread(target=handle_client, args=(conn, addr))
        client_thread.start()