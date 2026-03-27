import { createTRPCRouter } from "./create-context";
import { usersRouter } from "./routes/users";
import { postsRouter } from "./routes/posts";
import { storiesRouter } from "./routes/stories";
import { stampsRouter } from "./routes/stamps";
import { messagesRouter } from "./routes/messages";
import { mediaRouter } from "./routes/media";

export const appRouter = createTRPCRouter({
  users: usersRouter,
  posts: postsRouter,
  stories: storiesRouter,
  stamps: stampsRouter,
  messages: messagesRouter,
  media: mediaRouter,
});

export type AppRouter = typeof appRouter;
