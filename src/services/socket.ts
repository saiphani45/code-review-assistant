import io from "socket.io-client";

const SOCKET_URL = "http://localhost:8000";

export const socket = io(SOCKET_URL);

export const initializeSocket = (pullRequestId: number) => {
  socket.emit("join-review", pullRequestId);

  socket.on("new-comment", (comment) => {
    // We'll handle this in the component
  });

  socket.on("review-updated", (review) => {
    // We'll handle this in the component
  });

  return () => {
    socket.off("new-comment");
    socket.off("review-updated");
    socket.emit("leave-review", pullRequestId);
  };
};
