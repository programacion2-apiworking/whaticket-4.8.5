import React, { useContext, useEffect, useReducer, useState } from "react";

import {
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography // Importar Typography del Material-UI
} from "@material-ui/core";

import { makeStyles } from "@material-ui/core/styles";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { DeleteOutline, Edit } from "@material-ui/icons";
import PromptModal from "../../components/PromptModal";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/ConfirmationModal";
import { AuthContext } from "../../context/Auth/AuthContext";
import usePlans from "../../hooks/usePlans";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import { SocketContext } from "../../context/Socket/SocketContext";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  customTableCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  // Añadir un estilo para la caja roja
  redBox: {
    backgroundColor: "#ffcccc", // Definiendo el color de fondo rojo
    padding: theme.spacing(2), // Añadiendo un espaciado interno
    marginBottom: theme.spacing(2), // Añadiendo margen inferior para separar del contenido abajo
  },
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_PROMPTS") {
    const prompts = action.payload;
    const newPrompts = [];

    prompts.forEach((prompt) => {
      const promptIndex = state.findIndex((p) => p.id === prompt.id);
      if (promptIndex !== -1) {
        state[promptIndex] = prompt;
      } else {
        newPrompts.push(prompt);
      }
    });

    return [...state, ...newPrompts];
  }

  if (action.type === "UPDATE_PROMPTS") {
    const prompt = action.payload;
    const promptIndex = state.findIndex((p) => p.id === prompt.id);

    if (promptIndex !== -1) {
      state[promptIndex] = prompt;
      return [...state];
    } else {
      return [prompt, ...state];
    }
  }

  if (action.type === "DELETE_PROMPT") {
    const promptId = action.payload;
    const promptIndex = state.findIndex((p) => p.id === promptId);
    if (promptIndex !== -1) {
      state.splice(promptIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const Prompts = () => {
  const classes = useStyles();

  const [prompts, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);

  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const { user } = useContext(AuthContext);
  const { getPlanCompany } = usePlans();
  const history = useHistory();
  const companyId = user.companyId;

  const socketManager = useContext(SocketContext);

  useEffect(() => {
    async function fetchData() {
      const planConfigs = await getPlanCompany(undefined, companyId);
      if (!planConfigs.plan.useOpenAi) {
        toast.error("¡Esta empresa no tiene permiso para acceder a esta página! Te estamos redirigiendo.");
        setTimeout(() => {
          history.push(`/`)
        }, 1000);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/prompt");
        dispatch({ type: "LOAD_PROMPTS", payload: data.prompts });

        setLoading(false);
      } catch (err) {
        toastError(err);
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const socket = socketManager.getSocket(companyId);

    socket.on(`company-${companyId}-prompt`, (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_PROMPTS", payload: data.prompt });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_PROMPT", payload: data.promptId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [companyId, socketManager]);

  const handleOpenPromptModal = () => {
    setPromptModalOpen(true);
    setSelectedPrompt(null);
  };

  const handleClosePromptModal = () => {
    setPromptModalOpen(false);
    setSelectedPrompt(null);
  };

  const handleEditPrompt = (prompt) => {
    setSelectedPrompt(prompt);
    setPromptModalOpen(true);
  };

  const handleCloseConfirmationModal = () => {
    setConfirmModalOpen(false);
    setSelectedPrompt(null);
  };

  const handleDeletePrompt = async (promptId) => {
    try {
      const { data } = await api.delete(`/prompt/${promptId}`);
      toast.info(i18n.t(data.message));
    } catch (err) {
      toastError(err);
    }
    setSelectedPrompt(null);
  };

  return (
    <MainContainer>
      {/* Caja roja con el aviso */}
      <Paper className={classes.redBox} variant="outlined">
        <Typography variant="body1">
          <strong>Aviso Importante:</strong> Para todos los usuarios del wado que notaron una interrupción en el funcionamiento de OpenAI, nos gustaría aclarar que esto no se trata de un error del sistema. OpenAI ofrece un crédito gratuito de $5 USD para nuevos registros, sin embargo, este beneficio también está sujeto a un límite de tiempo, generalmente alrededor de tres meses. Cuando el crédito disponible se agota, es necesario recargar la cuenta para continuar utilizando el servicio. Es importante estar consciente de esta política para garantizar una experiencia continua y sin interrupciones en el uso de OpenAI con wado. Si notaste que el servicio dejó de funcionar, verifica si tu crédito gratuito expiró y considera recargar la cuenta, si es necesario. Estamos a disposición para ayudar y aclarar cualquier duda adicional que pueda surgir. Gracias por la comprensión y continuaremos trabajando para ofrecer el mejor servicio posible a nuestros usuarios.
        </Typography>
        {/* Enlaces útiles */}
        <Typography variant="body1">
          <strong>Enlaces Útiles:</strong>
          <br />
          Uso: <a href="https://platform.openai.com/usage">https://platform.openai.com/usage</a>
          <br />
          Facturación: <a href="https://platform.openai.com/account/billing/overview">https://platform.openai.com/account/billing/overview</a>
          <br />
          API: <a href="https://platform.openai.com/api-keys">https://platform.openai.com/api-keys</a>
        </Typography>
      </Paper>
      {/* Fin de la caja roja */}

      <ConfirmationModal
        title={
          selectedPrompt &&
          `${i18n.t("prompts.confirmationModal.deleteTitle")} ${selectedPrompt.name
          }?`
        }
        open={confirmModalOpen}
        onClose={handleCloseConfirmationModal}
        onConfirm={() => handleDeletePrompt(selectedPrompt.id)}
      >
        {i18n.t("prompts.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <PromptModal
        open={promptModalOpen}
        onClose={handleClosePromptModal}
        promptId={selectedPrompt?.id}
      />
      <MainHeader>
        <Title>{i18n.t("prompts.title")}</Title>
        <MainHeaderButtonsWrapper>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenPromptModal}
          >
            {i18n.t("prompts.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="left">
                {i18n.t("prompts.table.name")}
              </TableCell>
              <TableCell align="left">
                {i18n.t("prompts.table.queue")}
              </TableCell>
              <TableCell align="left">
                {i18n.t("prompts.table.max_tokens")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("prompts.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {prompts.map((prompt) => (
                <TableRow key={prompt.id}>
                  <TableCell align="left">{prompt.name}</TableCell>
                  <TableCell align="left">{prompt.queue.name}</TableCell>
                  <TableCell align="left">{prompt.maxTokens}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleEditPrompt(prompt)}
                    >
                      <Edit />
                    </IconButton>

                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedPrompt(prompt);
                        setConfirmModalOpen(true);
                      }}
                    >
                      <DeleteOutline />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={4} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Prompts;
