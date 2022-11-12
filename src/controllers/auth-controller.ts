import type { Request, Response } from 'express';
import axios, { AxiosError } from 'axios'
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken'
dotenv.config()

import { httpStatus } from '@config/http';
import { validateSchema } from '@helper/validateSchema';
import * as schema from '@model/ajvSchema'
import * as userService from '@service/user-service'
import { Prisma } from '@prisma/client'

type GoogleUserResponse = {
  iss: string;
  nbf: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: string;
  azp: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  iat: string;
  exp: string;
  jti: string;
  alg: string;
  kid: string;
  typ: string;
}

const singleSignOn = async (req: Request, res: Response) => {
  try {
    const data = req.body
    const { success, msg } = validateSchema(schema.registerSSOSchema, data)
    if (!success) return res.status(httpStatus.badRequest).send({ msg })

    const userData = await axios.get<GoogleUserResponse>(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${data.token}`)

    const userWithPosts = Prisma.validator<Prisma.UsersArgs>()({})

    type UserWithPosts = Prisma.UsersGetPayload<typeof userWithPosts>

    const user = await userService._getOne<UserWithPosts>({
      rawConfig: {
        where: {
          email: userData.data.email
        }
      }
    })

    if (user === null) {
      const resAddedUser = await userService._add({ username: userData.data.name, password: null, email: userData.data.email, imageProfile: userData.data.picture })
      if (!resAddedUser.success) return res.sendStatus(httpStatus.internalServerError)
    }

    const secret = process.env.JWT_SECRET;

    if (!secret)
      return res.status(httpStatus.internalServerError).send({
        message: 'the key is not found',
      });

    const token = jwt.sign(
      {
        username: userData.data.name,
        email: userData.data.email,
      },
      secret
    );

    res.send({
      data: {
        token,
      }
    })

  } catch (e) {
    console.error(e);
    if (e instanceof AxiosError) {
      return res.status(httpStatus.badRequest).send({
        msg: e.response?.data.error_description || 'error something about token'
      })
    }
    res.sendStatus(httpStatus.internalServerError)
  }
}

const signupWithEmail = async (req: Request, res: Response) => {
  try {
    const data = req.body

    const { success, msg } = validateSchema(schema.registerSchema, data)
    if (!success) return res.status(httpStatus.badRequest).send({ msg })

    const response = await userService._add(data)

    if (!response.success) return res.status(httpStatus.internalServerError).send(response)

    res.send(response)
  } catch (e) {
    console.error(e);
    res.sendStatus(httpStatus.internalServerError)
  }
}

const signInWithEmail = (req: Request, res: Response) => {
  try {
    res.sendStatus(httpStatus.notImplemented)
  } catch (error) {
    console.error(error);
    res.sendStatus(httpStatus.internalServerError)
  }
}

export {
  signupWithEmail,
  signInWithEmail,
  singleSignOn
}
