import { Title, Text, Anchor } from '@mantine/core';
import classes from './Welcome.module.css';

export function Welcome() {
  return (
    <>
      <Title className={classes.title} ta="center" mt={100}>
        <Text inherit variant="gradient" component="span" gradient={{ from: 'red', to: 'yellow' }}>
          Inferno
        </Text>{' '}Log Grapher
      </Title>
    </>
  );
}
